import os
from hmac import compare_digest
from threading import BoundedSemaphore
from fastapi import FastAPI,File,Header,HTTPException,UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from ocr.image_processing import ImageValidationError,MAX_FILE_SIZE,process_receipt_image
from ocr.extraction import extract_receipt_details

app = FastAPI(title="SpendSense AI Service")

OCR_CONCURRENCY=2
ocr_slots=BoundedSemaphore(OCR_CONCURRENCY)

# HEALTH

@app.get("/health")
def health():
    """Liveness check for AI microservice"""
    return {"status": "ok"}

# PLACEHOLDER REQUEST/RESPONSE MODELS

class SpendingAnalysisRequest(BaseModel):
    """placeholder request body for spending analysis"""
    # TODO: define real fields when the AI layers 2/3 are implemented later
    user_id: str | None=None

# ANALYSIS ENDPOINTS (PLACEHOLDER)

@app.post("/analysis/spending")
def analysis_spending(body:SpendingAnalysisRequest):
    """placeholder for the spending analysis endpoint
    we will eventually call scikit-learn models in order to surface anomalies, diff cash flow forcasts and category breakdowns"""
    return{
        "status":"not_implemented",
        "message":"spending analysis placeholder response",
    }

def validate_service_token(token:str|None):
    expected=os.getenv("AI_SERVICE_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="OCR service is not configured.",
        )
    if not token or not compare_digest(token,expected):
        raise HTTPException(
            status_code=401,
            detail="Invalid service credentials.",
        )

def validate_request_id(request_id:str|None):
    if not request_id:
        raise HTTPException(
            status_code=400,
            detail="X-Request-Id is required.",
        )
    if len(request_id)>128 or not request_id.isascii() or not request_id.isprintable():
        raise HTTPException(
            status_code=400,
            detail="Invalid X-Request-Id.",
        )

def process_ocr(image_bytes:bytes,content_type:str)->dict:
    image=process_receipt_image(image_bytes,content_type)
    try:
        return extract_receipt_details(image)
    finally:
        image.close()

@app.post("/ocr/process",responses={
    400:{"description":"Missing or invalid request identifier."},
    401:{"description":"Invalid internal service credentials."},
    413:{"description":"Receipt image exceeds the size or pixel limit."},
    415:{"description":"Unsupported receipt image format."},
    422:{"description":"Missing or invalid receipt image."},
    429:{"description":"OCR service is busy."},
    503:{"description":"OCR service is not configured or unavailable."},
    504:{"description":"Receipt recognition timed out."},
})
async def ocr_process(
    file:UploadFile=File(...),
    service_token:str|None=Header(default=None,alias="X-Service-Token"),
    request_id:str|None=Header(default=None,alias="X-Request-Id"),
):
    try:
        validate_service_token(service_token)
        validate_request_id(request_id)
        if file.content_type not in("image/jpeg","image/png"):
            raise HTTPException(
                status_code=415,
                detail="Only JPEG and PNG receipt images are supported.",
            )
        if file.size is not None and file.size>MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Receipt image exceeds the 8 MiB size limit.",
            )
        if not ocr_slots.acquire(blocking=False):
            raise HTTPException(
                status_code=429,
                detail="OCR service is busy. Please retry.",
            )
        try:
            image_bytes=await file.read(MAX_FILE_SIZE+1)
            if len(image_bytes)>MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Receipt image exceeds the 8 MiB size limit.",
                )
            try:
                result=await run_in_threadpool(
                    process_ocr,
                    image_bytes,
                    file.content_type,
                )
            except ImageValidationError as error:
                raise HTTPException(
                    status_code=error.status_code,
                    detail=error.message,
                )from error
            except RuntimeError as error:
                if "timeout" in str(error).lower():
                    raise HTTPException(
                        status_code=504,
                        detail="Receipt recognition timed out. Please retry.",
                    )from error
                raise HTTPException(
                    status_code=503,
                    detail="Receipt recognition is unavailable. Please retry.",
                )from error
            except OSError as error:
                raise HTTPException(
                    status_code=503,
                    detail="Receipt recognition is unavailable. Please retry.",
                )from error
            return{
                "request_id":request_id,
                "merchant":result["merchant"],
                "receipt_date":result["receipt_date"],
                "total":result["total"],
                "currency":result["currency"],
                "confidence":result["confidence"],
                "warnings":result["warnings"],
            }
        finally:
            ocr_slots.release()
    finally:
        await file.close()