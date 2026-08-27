from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "payguard-ml-service"
    assert data["modelsLoaded"]["classifier"] is True

def test_model_info_endpoint():
    response = client.get("/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["isClassifierReady"] is True
    assert "INSUFFICIENT_FUNDS" in data["supportedCategories"]

def test_node_bridge_predict_endpoint():
    payload = {
        "rawText": "card_declined_insufficient_funds_51",
        "gateway": "STRIPE",
        "issuingBank": "Chase",
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "INSUFFICIENT_FUNDS"
    assert data["isoCode"] == "51"
    assert data["confidence"] > 0.7
    assert data["source"] in ["ML", "ML_ISO_EXACT"]
    assert "modelVersion" in data

def test_anomaly_endpoint():
    payload = {
        "amount": 250.0,
        "gateway": "STRIPE",
        "failureRateWindow": 4.5,
        "retryCount": 0,
        "hourOfDay": 15,
    }
    response = client.post("/anomaly/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "anomalyScore" in data
    assert "alertLevel" in data
    assert "explanation" in data
