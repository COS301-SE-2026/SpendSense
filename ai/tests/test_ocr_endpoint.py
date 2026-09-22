from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
import main

client=TestClient(main.app)

VALID_RESULT={
    "merchant":"SHOPRITE",
    "receipt_date":"2026-09-21",
    "total":"49.72",
    "currency":"ZAR",
    "confidence":0.94,
    "warnings":[],
}

def make_image()->bytes:
    image=Image.new("RGB",(20,20),"white")
    output=BytesIO()
    image.save(output,format="PNG")
    return output.getvalue()

def upload(
    image_bytes:bytes,
    content_type:str="image/png",
    token:str="test-secret",
    request_id:str="test-request-123",
):
    return client.post(
        "/ocr/process",
        headers={
            "X-Service-Token":token,
            "X-Request-Id":request_id,
        },
        files={
            "file":("receipt.png",image_bytes,content_type),
        },
    )

def test_processes_valid_receipt(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    monkeypatch.setattr(
        main,
        "extract_receipt_details",
        lambda image:VALID_RESULT,
    )
    response=upload(make_image())
    assert response.status_code==200
    assert response.json()=={
        "request_id":"test-request-123",
        **VALID_RESULT,
    }

def test_rejects_invalid_service_token(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(make_image(),token="wrong-secret")
    assert response.status_code==401

def test_rejects_missing_service_token(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=client.post(
        "/ocr/process",
        headers={"X-Request-Id":"test-request-123"},
        files={"file":("receipt.png",make_image(),"image/png")},
    )
    assert response.status_code==401

def test_rejects_unconfigured_service(monkeypatch):
    monkeypatch.delenv("AI_SERVICE_TOKEN",raising=False)
    response=upload(make_image())
    assert response.status_code==503

def test_rejects_missing_request_id(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=client.post(
        "/ocr/process",
        headers={"X-Service-Token":"test-secret"},
        files={"file":("receipt.png",make_image(),"image/png")},
    )
    assert response.status_code==400

def test_rejects_invalid_request_id(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(make_image(),request_id="invalid\nrequest")
    assert response.status_code==400

def test_rejects_unsupported_upload_type(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(make_image(),content_type="application/pdf")
    assert response.status_code==415

def test_rejects_mismatched_image_content(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(make_image(),content_type="image/jpeg")
    assert response.status_code==415

def test_rejects_empty_image(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(b"")
    assert response.status_code==422

def test_rejects_corrupted_image(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=upload(b"not an image")
    assert response.status_code==422

def test_rejects_oversized_image(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    monkeypatch.setattr(main,"MAX_FILE_SIZE",10)
    response=upload(make_image())
    assert response.status_code==413

def test_rejects_busy_service(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    assert main.ocr_slots.acquire(blocking=False)
    assert main.ocr_slots.acquire(blocking=False)
    try:
        response=upload(make_image())
        assert response.status_code==429
    finally:
        main.ocr_slots.release()
        main.ocr_slots.release()

def test_returns_safe_timeout_response(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    def timeout(image):
        raise RuntimeError("Tesseract process timeout")
    monkeypatch.setattr(main,"extract_receipt_details",timeout)
    response=upload(make_image())
    assert response.status_code==504
    assert response.json()["detail"]=="Receipt recognition timed out. Please retry."

def test_returns_safe_service_error(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    def unavailable(image):
        raise OSError("private filesystem or engine detail")
    monkeypatch.setattr(main,"extract_receipt_details",unavailable)
    response=upload(make_image())
    assert response.status_code==503
    assert "private filesystem" not in response.text

def test_health_remains_available_without_token(monkeypatch):
    monkeypatch.delenv("AI_SERVICE_TOKEN",raising=False)
    response=client.get("/health")
    assert response.status_code==200
    assert response.json()=={"status":"ok"}

def test_spending_placeholder_remains_available():
    response=client.post(
        "/analysis/spending",
        json={"user_id":"test-user"},
    )
    assert response.status_code==200
    assert response.json()["status"]=="not_implemented"