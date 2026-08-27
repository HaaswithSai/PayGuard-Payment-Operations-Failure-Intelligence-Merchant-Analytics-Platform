import json
import joblib
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest

from config import settings
from utils.text_normalization import normalize_text
from utils.feature_engineering import extract_anomaly_features

def train_models():
    """
    Trains the Failure Classification ML model and the IsolationForest Anomaly Detector,
    then serializes the artifacts to the configured models/ directory.
    """
    print("[Trainer] Starting Model Training Pipeline...")

    # 1. Train Failure Classifier
    if not settings.FAILURE_DATASET_PATH.exists():
        raise FileNotFoundError(f"Training dataset not found at {settings.FAILURE_DATASET_PATH}")

    with open(settings.FAILURE_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_texts = [normalize_text(item["text"]) for item in data]
    labels = [item["category"] for item in data]

    print(f"[Trainer] Fitting TfidfVectorizer on {len(raw_texts)} labeled failure examples...")
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
    )
    X_train = vectorizer.fit_transform(raw_texts)

    print("[Trainer] Fitting LogisticRegression classifier...")
    classifier = LogisticRegression(
        C=5.0,
        max_iter=1000,
        random_state=42,
    )
    classifier.fit(X_train, labels)

    # Save Classifier and Vectorizer
    joblib.dump(classifier, settings.CLASSIFIER_PATH)
    joblib.dump(vectorizer, settings.VECTORIZER_PATH)
    print(f"[Trainer] Saved Classifier -> {settings.CLASSIFIER_PATH}")
    print(f"[Trainer] Saved Vectorizer -> {settings.VECTORIZER_PATH}")

    # 2. Train Anomaly Detection Model (Isolation Forest)
    print("[Trainer] Generating synthetic operational baseline for IsolationForest...")
    np.random.seed(42)
    normal_samples = []
    
    # 500 Normal transactions
    for _ in range(500):
        amt = np.random.exponential(scale=120.0) + 5.0
        fail_rate = np.random.beta(a=1, b=20) * 10.0 # mostly 0-5%
        retries = int(np.random.choice([0, 1, 2], p=[0.85, 0.12, 0.03]))
        hour = int(np.random.randint(6, 23))
        vec = extract_anomaly_features(amt, fail_rate, retries, hour, merchant_daily_volume=5000.0)
        normal_samples.append(vec[0])

    # 30 Outliers / Spikes (High retry bursts, 3 AM high dollar amounts, 80% failure rate)
    for _ in range(30):
        amt = np.random.uniform(5000.0, 25000.0)
        fail_rate = np.random.uniform(30.0, 95.0)
        retries = int(np.random.randint(4, 10))
        hour = int(np.random.randint(0, 5))
        vec = extract_anomaly_features(amt, fail_rate, retries, hour, merchant_daily_volume=3000.0)
        normal_samples.append(vec[0])

    X_anomaly_train = np.array(normal_samples)
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.06,
        random_state=42
    )
    iso_forest.fit(X_anomaly_train)

    joblib.dump(iso_forest, settings.ANOMALY_MODEL_PATH)
    print(f"[Trainer] Saved Anomaly Detector -> {settings.ANOMALY_MODEL_PATH}")
    print("[Trainer] Model Training Pipeline Complete!")

if __name__ == "__main__":
    train_models()
