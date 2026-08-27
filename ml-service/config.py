import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    SERVICE_NAME: str = "payguard-ml-service"
    SERVICE_VERSION: str = "1.0.0"
    MODEL_VERSION: str = "ml-classifier-v1.0"
    ANOMALY_MODEL_VERSION: str = "ml-anomaly-isoforest-v1.0"
    
    HOST: str = os.getenv("ML_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_PORT", "8000"))
    
    # Model Artifact Paths
    CLASSIFIER_PATH: Path = MODEL_DIR / "classifier.joblib"
    VECTORIZER_PATH: Path = MODEL_DIR / "vectorizer.joblib"
    ANOMALY_MODEL_PATH: Path = MODEL_DIR / "anomaly_detector.joblib"
    
    # Dataset Paths
    FAILURE_DATASET_PATH: Path = DATA_DIR / "failure_dataset.json"
    ANOMALY_DATASET_PATH: Path = DATA_DIR / "anomaly_dataset.json"

    # Canonical 10 Failure Categories
    FAILURE_CATEGORIES = [
        "INSUFFICIENT_FUNDS",
        "CARD_EXPIRED",
        "AUTHENTICATION_FAILED",
        "FRAUD_SUSPECTED",
        "NETWORK_TIMEOUT",
        "LIMIT_EXCEEDED",
        "INVALID_DETAILS",
        "GATEWAY_ERROR",
        "SYSTEM_ERROR",
        "OTHERS",
    ]

settings = Settings()
