from io import BytesIO
from PIL import Image,ImageDraw,ImageFont
from fastapi.testclient import TestClient
from main import app

client=TestClient(app)

def make_receipt()->bytes:
    image=Image.new("RGB",(1000,400),"white")
    draw=ImageDraw.Draw(image)
    font=ImageFont.load_default(size=48)
    draw.text(
        (40,30),
        "SHOPRITE",
        fill="black",
        font=font,
    )
    draw.text(
        (40,130),
        "21/09/2026",
        fill="black",
        font=font,
    )
    draw.text(
        (40,230),
        "TOTAL R 49.72",
        fill="black",
        font=font,
    )
    output=BytesIO()
    image.save(output,format="PNG")
    return output.getvalue()

def test_processes_receipt_using_real_tesseract(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN","test-secret")
    response=client.post(
        "/ocr/process",
        headers={
            "X-Service-Token":"test-secret",
            "X-Request-Id":"integration-test-001",
        },
        files={
            "file":("receipt.png",make_receipt(),"image/png"),
        },
    )
    assert response.status_code==200
    result=response.json()
    assert result["request_id"]=="integration-test-001"
    assert result["merchant"]=="SHOPRITE"
    assert result["receipt_date"]=="2026-09-21"
    assert result["total"]=="49.72"
    assert result["currency"]=="ZAR"
    assert 0<=result["confidence"]<=1