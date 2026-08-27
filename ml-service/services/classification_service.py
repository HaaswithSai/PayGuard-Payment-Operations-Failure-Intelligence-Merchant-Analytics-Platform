import numpy as np
from typing import Dict, Any, Optional

from config import settings
from services.model_loader import model_loader
from utils.text_normalization import normalize_text, extract_iso_code
from schemas.classification import PredictRequest, PredictResponse

class ClassificationService:
    def __init__(self):
        if not model_loader.is_loaded:
            model_loader.load_or_train()

    def classify_failure(self, request: PredictRequest) -> PredictResponse:
        """
        Classifies a raw gateway failure string into a canonical category with confidence and ISO code.
        """
        raw_text = request.rawText or ""
        normalized = normalize_text(raw_text)

        if not normalized:
            return PredictResponse(
                category="OTHERS",
                isoCode=None,
                confidence=0.5,
                source="ML_FALLBACK",
                modelVersion=settings.MODEL_VERSION,
                normalizedText="",
            )

        # 1. Check direct ISO 8583 extraction from raw text or metadata
        extracted_iso, mapped_cat = extract_iso_code(raw_text)
        if not extracted_iso and request.metadata:
            meta_iso = str(request.metadata.get("isoCode", ""))
            extracted_iso, mapped_cat = extract_iso_code(meta_iso)

        if extracted_iso and mapped_cat:
            return PredictResponse(
                category=mapped_cat,
                isoCode=extracted_iso,
                confidence=1.0,
                source="ML_ISO_EXACT",
                modelVersion=settings.MODEL_VERSION,
                normalizedText=normalized,
            )

        # 2. Machine Learning Inference (TF-IDF + Logistic Regression)
        classifier = model_loader.classifier
        vectorizer = model_loader.vectorizer

        if classifier is None or vectorizer is None:
            return PredictResponse(
                category="OTHERS",
                isoCode=None,
                confidence=0.5,
                source="FALLBACK",
                modelVersion=settings.MODEL_VERSION,
                normalizedText=normalized,
            )

        X = vectorizer.transform([normalized])
        probs = classifier.predict_proba(X)[0]
        max_idx = np.argmax(probs)
        best_category = classifier.classes_[max_idx]
        confidence = float(probs[max_idx])

        # If model is uncertain (< 0.35 probability across classes), fallback to OTHERS
        if confidence < 0.35:
            best_category = "OTHERS"
            confidence = 0.5

        return PredictResponse(
            category=best_category,
            isoCode=extracted_iso,
            confidence=round(confidence, 3),
            source="ML",
            modelVersion=settings.MODEL_VERSION,
            normalizedText=normalized,
        )

classification_service = ClassificationService()
