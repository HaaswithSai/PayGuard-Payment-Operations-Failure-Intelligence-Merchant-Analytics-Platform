import numpy as np
from config import settings
from services.model_loader import model_loader
from utils.feature_engineering import extract_anomaly_features, explain_risk_flags
from schemas.anomaly import AnomalyScoreRequest, AnomalyScoreResponse

class AnomalyService:
    def __init__(self):
        if not model_loader.is_loaded:
            model_loader.load_or_train()

    def score_anomaly(self, request: AnomalyScoreRequest) -> AnomalyScoreResponse:
        """
        Evaluates an operational payment request using IsolationForest to detect statistical outliers.
        """
        detector = model_loader.anomaly_detector
        if detector is None:
            return AnomalyScoreResponse(
                isAnomaly=False,
                anomalyScore=0.1,
                alertLevel="LOW",
                explanation="Anomaly detector model uninitialized",
                riskFlags=[],
                modelVersion=settings.ANOMALY_MODEL_VERSION,
            )

        features = extract_anomaly_features(
            amount=request.amount,
            failure_rate_window=request.failureRateWindow,
            retry_count=request.retryCount,
            hour_of_day=request.hourOfDay,
            merchant_daily_volume=request.merchantDailyVolume or 5000.0,
        )

        # IsolationForest decision_function: lower score = more anomalous
        raw_score = float(detector.decision_function(features)[0])
        
        # Transform raw score (-0.5 to 0.5) to a clean 0.0 - 1.0 anomaly risk index
        normalized_anomaly_score = float(np.clip(1.0 / (1.0 + np.exp(raw_score * 8.0)), 0.0, 1.0))
        is_anomaly = bool(detector.predict(features)[0] == -1)

        # Categorize Alert Level
        if normalized_anomaly_score >= 0.80:
            alert_level = "CRITICAL"
        elif normalized_anomaly_score >= 0.60:
            alert_level = "HIGH"
        elif normalized_anomaly_score >= 0.40:
            alert_level = "MEDIUM"
        else:
            alert_level = "LOW"

        risk_flags = explain_risk_flags(
            amount=request.amount,
            failure_rate_window=request.failureRateWindow,
            retry_count=request.retryCount,
            hour_of_day=request.hourOfDay,
            anomaly_score=normalized_anomaly_score,
        )

        explanation = (
            f"Pattern evaluated with anomaly score of {normalized_anomaly_score:.2f}. "
            f"Alert Level: {alert_level}. "
            f"Identified {len(risk_flags)} operational risk indicator(s)."
        )

        return AnomalyScoreResponse(
            isAnomaly=is_anomaly,
            anomalyScore=round(normalized_anomaly_score, 3),
            alertLevel=alert_level,
            explanation=explanation,
            riskFlags=risk_flags,
            modelVersion=settings.ANOMALY_MODEL_VERSION,
        )

anomaly_service = AnomalyService()
