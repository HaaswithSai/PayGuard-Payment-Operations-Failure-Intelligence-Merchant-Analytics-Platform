import joblib
from pathlib import Path
from typing import Tuple, Any, Optional

from config import settings
from utils.trainer import train_models

class ModelLoader:
    _instance: Optional["ModelLoader"] = None

    def __init__(self):
        self.classifier: Optional[Any] = None
        self.vectorizer: Optional[Any] = None
        self.anomaly_detector: Optional[Any] = None
        self.is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "ModelLoader":
        if cls._instance is None:
            cls._instance = ModelLoader()
        return cls._instance

    def load_or_train(self):
        """Loads models from disk, or automatically trains them if not found."""
        if not (
            settings.CLASSIFIER_PATH.exists()
            and settings.VECTORIZER_PATH.exists()
            and settings.ANOMALY_MODEL_PATH.exists()
        ):
            print("[ModelLoader] Artifacts missing on disk. Triggering bootstrap training...")
            train_models()

        try:
            self.classifier = joblib.load(settings.CLASSIFIER_PATH)
            self.vectorizer = joblib.load(settings.VECTORIZER_PATH)
            self.anomaly_detector = joblib.load(settings.ANOMALY_MODEL_PATH)
            self.is_loaded = True
            print("[ModelLoader] Successfully loaded ML models into memory.")
        except Exception as e:
            print(f"[ModelLoader] Error loading models: {e}. Re-training...")
            train_models()
            self.classifier = joblib.load(settings.CLASSIFIER_PATH)
            self.vectorizer = joblib.load(settings.VECTORIZER_PATH)
            self.anomaly_detector = joblib.load(settings.ANOMALY_MODEL_PATH)
            self.is_loaded = True

model_loader = ModelLoader.get_instance()
