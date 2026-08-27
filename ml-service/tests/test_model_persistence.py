import os
import joblib
from pathlib import Path
from config import settings
from services.model_loader import ModelLoader

def test_model_files_exist_on_disk():
    assert settings.CLASSIFIER_PATH.exists(), f"Classifier missing at {settings.CLASSIFIER_PATH}"
    assert settings.VECTORIZER_PATH.exists(), f"Vectorizer missing at {settings.VECTORIZER_PATH}"
    assert settings.ANOMALY_MODEL_PATH.exists(), f"Anomaly detector missing at {settings.ANOMALY_MODEL_PATH}"

    assert os.path.getsize(settings.CLASSIFIER_PATH) > 1000, "Classifier artifact is empty or corrupted"
    assert os.path.getsize(settings.VECTORIZER_PATH) > 1000, "Vectorizer artifact is empty or corrupted"
    assert os.path.getsize(settings.ANOMALY_MODEL_PATH) > 10000, "Anomaly detector artifact is empty or corrupted"

def test_clean_reload_across_restart():
    """Simulates a fresh process reboot loading artifacts from disk without retraining"""
    fresh_loader = ModelLoader()
    assert fresh_loader.is_loaded is False

    fresh_loader.load_or_train()
    assert fresh_loader.is_loaded is True
    assert fresh_loader.classifier is not None
    assert fresh_loader.vectorizer is not None
    assert fresh_loader.anomaly_detector is not None

    # Check classifier has classes
    assert len(fresh_loader.classifier.classes_) == 10
    assert "INSUFFICIENT_FUNDS" in fresh_loader.classifier.classes_

    # Check vectorizer has vocabulary
    assert len(fresh_loader.vectorizer.vocabulary_) > 50
