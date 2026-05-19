from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SpendSense AI Service")

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

class OcrProcessRequest(BaseModel):
    """placeholder req body for ocr processing"""
    # TODO: accept file reference/S3 key when ocr is implemeted later
    receipt_reference: str | None=None

# ANALYSIS ENDPOINTS (PLACEHOLDER)

@app.post("/analysis/spending")
def analysis_spending(body:SpendingAnalysisRequest):
    """placeholder for the spending analysis endpoint
    we will eventually call scikit-learn models in order to surface anomalies, diff cash flow forcasts and category breakdowns"""
    return{
        "status":"not_implemented",
        "message":"spending analysis placeholder response",
    }

@app.post("/ocr/process")
def ocr_process(body:OcrProcessRequest):
    """placeholder for receipt ocr processing endpoint
    it will call tesseract, extract (amount/date/vendor), and return data that's structures for user confirmation"""
    return{
        "status": "not_implemented",
        "message":"ocr processing placeholder response",
    }