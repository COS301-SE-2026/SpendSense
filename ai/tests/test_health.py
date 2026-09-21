from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_spending_analysis_returns_placeholder():
    response = client.post("/analysis/spending", json={})

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "not_implemented"
    assert "spending" in data["message"].lower()


def test_ocr_process_returns_placeholder():
    response = client.post("/ocr/process", json={})

    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "not_implemented"
    assert "ocr" in data["message"].lower()