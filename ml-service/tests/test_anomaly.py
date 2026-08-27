import pytest
from services.anomaly_service import anomaly_service
from schemas.anomaly import AnomalyScoreRequest

def test_normal_transaction_scoring():
    req = AnomalyScoreRequest(
        amount=85.0,
        gateway="STRIPE",
        failureRateWindow=2.0,
        retryCount=0,
        hourOfDay=14,
        merchantDailyVolume=5000.0,
    )
    res = anomaly_service.score_anomaly(req)
    assert res.alertLevel in ["LOW", "MEDIUM"]
    assert res.anomalyScore < 0.65

def test_anomalous_burst_scoring():
    req = AnomalyScoreRequest(
        amount=18500.0,
        gateway="STRIPE",
        failureRateWindow=88.0,
        retryCount=7,
        hourOfDay=3, # 3 AM
        merchantDailyVolume=2000.0,
    )
    res = anomaly_service.score_anomaly(req)
    assert res.alertLevel in ["HIGH", "CRITICAL"]
    assert res.anomalyScore >= 0.60
    assert len(res.riskFlags) >= 2
    assert "HIGH_TRANSACTION_VALUE" in res.riskFlags
    assert "HIGH_RETRY_FREQUENCY" in res.riskFlags
