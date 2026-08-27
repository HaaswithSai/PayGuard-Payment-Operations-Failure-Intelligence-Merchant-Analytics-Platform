# 🤖 PayGuard — AI Failure Classification & Anomaly Detection Microservice Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Complete reference for the Python FastAPI AI Microservice, TF-IDF + Logistic Regression NLP classification, ISO 8583 extraction, IsolationForest operational anomaly detection, dataset management, and Node.js backend bridge integration.

---

## 📌 1. AI Microservice Architecture

The PayGuard AI Layer provides high-speed, explainable machine learning predictions for raw payment decline text and multidimensional operational anomaly scoring:

```
                           Node.js Backend
                       (mlClient.service.js)
                                 │
                         POST /api/v1/predict
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ FastAPI Inference App │
                     │ (Port: 8000)          │
                     └───────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [Failure Classifier]            [Anomaly Detector]
        - Text Normalization            - Feature Vectorizer
        - ISO 8583 Code Matcher         - IsolationForest
        - TF-IDF + Logistic Regression  - Alert Level (Low-Crit)
        - Confidence Score              - Risk Flags & Explanations
```

---

## 📂 2. Microservice Project Structure

```
ml-service/
├── app.py                      # FastAPI application with REST endpoints & lifespan loader
├── config.py                   # Service configurations, model artifact paths, categories
├── requirements.txt            # Python dependencies (fastapi, scikit-learn, pydantic, joblib)
├── schemas/
│   ├── common.py               # HealthResponse, ModelInfoResponse
│   ├── classification.py       # PredictRequest, PredictResponse, BatchPredict
│   └── anomaly.py              # AnomalyScoreRequest, AnomalyScoreResponse
├── data/
│   └── failure_dataset.json    # Labeled bootstrap dataset covering 10 canonical failure domains
├── utils/
│   ├── text_normalization.py   # Tokenization, regex stripping, ISO 8583 code extractors
│   ├── feature_engineering.py  # Numeric feature transformers & risk flag explainers
│   └── trainer.py              # Self-contained model training & serialization script
├── models/
│   ├── classifier.joblib       # Trained LogisticRegression model
│   ├── vectorizer.joblib       # Fitted TfidfVectorizer
│   └── anomaly_detector.joblib # Fitted IsolationForest detector
├── services/
│   ├── model_loader.py         # Thread-safe model artifact loader with auto-training
│   ├── classification_service.py # NLP inference pipeline
│   └── anomaly_service.py      # Anomaly evaluation service
└── tests/
    ├── test_classification.py  # Unit tests for text normalization & category mapping
    ├── test_anomaly.py         # Unit tests for operational vector scoring & risk flags
    └── test_api.py             # Integration tests for FastAPI endpoints
```

---

## 🧠 3. Dataset Strategy & Synthetic Bootstrap

### Why Domain Synthetic Bootstrapping is Standard for Payment Failure Classification:
In payment operations, proprietary cardholder decline messages are governed by strict PCI-DSS and financial privacy regulations. Consequently, industry standard systems bootstrap with **synthetic domain-informed datasets**:

1. **Real-world Gateway Error Taxonomy**: Matches patterns from Stripe (`card_declined:insufficient_funds`), Adyen (`Refused:ExpiredCard`), Razorpay (`BAD_REQUEST_PAYMENT_DECLINED_BY_BANK`), PayPal, and Checkout.
2. **Morphological Variations**: Covers casing differences, hyphens/underscores/slashes, and ISO tokens (`51`, `54`, `05`, `59`, `61`, `96`, etc.).
3. **Operational Anomaly Vectors**: Simulates normal distribution (daytime $5–$500 transactions, <5% failure rate, 0–2 retries) vs high-risk anomalies ($10,000+ at 3 AM with 90% failure rates and retry bursts).

---

## 🌐 4. Endpoints Reference (`http://localhost:8000`)

---

### 1. NLP Failure Classification (Node.js Bridge Compatible)
- **Endpoint**: `POST /api/v1/predict` (and `POST /classify/failure`)
- **Request Body**:
  ```json
  {
    "rawText": "card_declined_insufficient_funds_51",
    "gateway": "STRIPE",
    "issuingBank": "Chase"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "category": "INSUFFICIENT_FUNDS",
    "isoCode": "51",
    "confidence": 1.0,
    "source": "ML_ISO_EXACT",
    "modelVersion": "ml-classifier-v1.0",
    "normalizedText": "card declined insufficient funds 51"
  }
  ```

---

### 2. Operational Anomaly & Risk Scoring
- **Endpoint**: `POST /anomaly/score`
- **Request Body**:
  ```json
  {
    "amount": 18500.0,
    "gateway": "STRIPE",
    "failureRateWindow": 85.0,
    "retryCount": 6,
    "hourOfDay": 3,
    "merchantDailyVolume": 2500.0
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "isAnomaly": true,
    "anomalyScore": 0.88,
    "alertLevel": "CRITICAL",
    "explanation": "Pattern evaluated with anomaly score of 0.88. Alert Level: CRITICAL. Identified 4 operational risk indicator(s).",
    "riskFlags": [
      "HIGH_TRANSACTION_VALUE",
      "ELEVATED_FAILURE_RATE_SPIKE",
      "HIGH_RETRY_FREQUENCY",
      "OFF_HOURS_TRANSACTION_ACTIVITY",
      "MULTIDIMENSIONAL_STATISTICAL_OUTLIER"
    ],
    "modelVersion": "ml-anomaly-isoforest-v1.0"
  }
  ```

---

### 3. Service Health Telemetry
- **Endpoint**: `GET /health` (and `GET /api/v1/health`)
- **Success Response (200 OK)**:
  ```json
  {
    "status": "healthy",
    "service": "payguard-ml-service",
    "version": "1.0.0",
    "modelsLoaded": {
      "classifier": true,
      "vectorizer": true,
      "anomaly_detector": true
    }
  }
  ```

---

### 4. Dynamic Retraining Endpoint
- **Endpoint**: `POST /train/models`
- **Response**: Retrains `TfidfVectorizer`, `LogisticRegression`, and `IsolationForest` on disk and hot-reloads them in memory without downtime.

---

## 🧪 5. Automated Test Suite

Executed via `python -m pytest tests -v` in `ml-service/`:

```
============================= test session starts =============================
platform win32 -- Python 3.12.2, pytest-8.2.2
collected 14 items

tests/test_anomaly.py::test_normal_transaction_scoring PASSED            [  7%]
tests/test_anomaly.py::test_anomalous_burst_scoring PASSED               [ 14%]
tests/test_api.py::test_health_endpoint PASSED                           [ 21%]
tests/test_api.py::test_model_info_endpoint PASSED                       [ 28%]
tests/test_api.py::test_node_bridge_predict_endpoint PASSED              [ 35%]
tests/test_api.py::test_anomaly_endpoint PASSED                          [ 42%]
tests/test_classification.py::test_text_normalization PASSED             [ 50%]
tests/test_classification.py::test_extract_iso_code PASSED               [ 57%]
tests/test_classification.py::test_classify_insufficient_funds PASSED    [ 64%]
tests/test_classification.py::test_classify_card_expired PASSED          [ 71%]
tests/test_classification.py::test_classify_auth_failed PASSED           [ 78%]
tests/test_classification.py::test_classify_fraud PASSED                 [ 85%]
tests/test_classification.py::test_classify_timeout PASSED               [ 92%]
tests/test_classification.py::test_metadata_iso_override PASSED          [100%]

======================== 14 passed in 1.93s ========================
```

---

## 🚀 6. How to Run the AI Microservice

```bash
# 1. Navigate to ml-service
cd ml-service

# 2. Run with Uvicorn
python app.py
# or
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
