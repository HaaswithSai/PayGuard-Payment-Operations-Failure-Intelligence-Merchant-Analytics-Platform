# 🧠 PayGuard — Failure Classification Engine & Queue Workers Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Complete reference for background failure classification, ISO 8583 response code normalization, rule-based heuristics, Python ML microservice bridge, queue worker concurrency locking, and manual review overrides.

---

## 📌 1. Background Classification Pipeline

When a payment fails during webhook ingestion, a high-priority background job (`jobType: 'CLASSIFICATION'`, `priority: 10`) is scheduled in the `ProcessingQueue`. The queue worker consumes the job, normalizes the raw gateway decline message into standard taxonomy categories, and persists a `FailureClassification` record linked 1:1 to the `Payment`.

```
               ProcessingQueue (Job: CLASSIFICATION)
                               │
                               ▼
               ┌──────────────────────────────┐
               │ 1. Atomic Worker Lock        │
               │    (findOneAndUpdate lock)   │
               └──────────────────────────────┘
                               │
                               ▼
               ┌──────────────────────────────┐
               │ 2. Text Normalization        │
               │    (Punctuation/Casing/Trim) │
               └──────────────────────────────┘
                               │
                               ▼
               ┌──────────────────────────────┐
               │ 3. ML Service Bridge Check   │
               │    (HTTP /predict endpoint)  │
               └──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │ (Online & High Conf)        │ (Offline / Low Conf)
                ▼                             ▼
       [ML Classification]         ┌──────────────────────────────┐
                                   │ 4. ISO 8583 Code Mapping     │
                                   │    (Exact match: Conf 1.0)   │
                                   └──────────────────────────────┘
                                                  │
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │ 5. Keyword Taxonomy Rules    │
                                   │    (Heuristics: Conf 0.9+)   │
                                   └──────────────────────────────┘
                                                  │
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │ 6. Fallback (OTHERS: 0.5)    │
                                   └──────────────────────────────┘
                                                  │
                                                  ▼
               ┌──────────────────────────────────────────────────┐
               │ 7. Upsert FailureClassification Record (1:1)     │
               │    (predictedCategory, isoCode, confidence)      │
               └──────────────────────────────────────────────────┘
                               │
                               ▼
               ┌──────────────────────────────────────────────────┐
               │ 8. Complete Queue Job & Emit AuditLog            │
               │    (Action: FAILURE_CLASSIFIED)                  │
               └──────────────────────────────────────────────────┘
```

---

## 📂 2. Module Directory Structure

```
backend/src/
├── data/
│   └── failureRules.js             # ISO 8583 response codes and keyword taxonomy dictionary
├── utils/
│   ├── textNormalization.utils.js  # Tokenization, punctuation removal, whitespace trimming
│   ├── iso8583.utils.js            # Direct ISO code lookup & regex pattern extraction
│   └── failureNormalization.utils.js # Rule engine combining ISO codes and keyword heuristics
├── services/
│   ├── classification.service.js   # Orchestration, ML fallback, upserting, manual overrides
│   ├── mlClient.service.js         # HTTP client bridge for future Python ML microservice
│   └── queue.service.js            # Concurrency worker locking, status transitions, backoff retries
├── workers/
│   ├── classification.worker.js    # Job handler for 'CLASSIFICATION' tasks
│   └── queue.worker.js             # Queue dispatcher loop, batch runner, and background engine
├── controllers/
│   └── classification.controller.js # Inspection endpoints and manual queue triggers
└── routes/
    ├── classification.routes.js    # Mounted at /api/v1/classifications
    └── queue.routes.js             # Mounted at /api/v1/queue
```

---

## 🏷️ 3. Failure Taxonomy & ISO 8583 Mapping Dictionary

PayGuard standardizes all arbitrary gateway error messages into 10 canonical payment failure categories:

| Category | Typical Causes | Standard ISO 8583 Codes | Default Confidence |
| :--- | :--- | :---: | :---: |
| **`INSUFFICIENT_FUNDS`** | Account low balance, credit limit exceeded, NSF | `51` | `1.0` / `0.95` |
| **`CARD_EXPIRED`** | Card expiration date passed, invalid card validity | `54` | `1.0` / `0.95` |
| **`AUTHENTICATION_FAILED`** | 3D-Secure failure, incorrect OTP/PIN, CVV mismatch, Do Not Honor | `05`, `82` | `0.98` / `0.90` |
| **`FRAUD_SUSPECTED`** | Stolen card, high risk score, sanction list, velocity spike | `59` | `0.98` |
| **`NETWORK_TIMEOUT`** | Gateway/Issuer socket timeout (504), connection reset (ECONNRESET) | `TO` | `0.95` |
| **`LIMIT_EXCEEDED`** | Card daily withdrawal limit, frequency velocity limit | `61`, `65` | `0.95` / `0.92` |
| **`INVALID_DETAILS`** | Luhn check failure, incorrect card number, invalid routing | `14`, `57` | `0.95` / `0.92` |
| **`GATEWAY_ERROR`** | Gateway unavailable (502), processor rejected request | `GW` | `0.90` |
| **`SYSTEM_ERROR`** | Switch inoperative, issuer malfunction (500), internal error | `91`, `96` | `0.95` / `0.90` |
| **`OTHERS`** | Unrecognized, ambiguous, or custom bank error tokens | `null` | `0.50` |

---

## 🔒 4. Queue Concurrency & Worker Locking Strategy

To ensure zero duplicate processing across scaled multi-worker nodes:

### Atomic Lock Acquisition
```javascript
const job = await ProcessingQueue.findOneAndUpdate(
  {
    status: 'PENDING',
    scheduledAt: { $lte: new Date() },
    retryCount: { $lt: 5 },
  },
  {
    $set: {
      status: 'PROCESSING',
      lockedAt: new Date(),
      lockedBy: workerId,
    },
  },
  { sort: { priority: -1, scheduledAt: 1 }, new: true }
);
```

### Exponential Backoff on Failure:
$$\text{ScheduledAt} = \text{Date.now}() + \left(2^{\text{retryCount}} \times 1000\text{ ms}\right)$$
- Attempt 1 failure $\rightarrow$ Retry in 2s
- Attempt 2 failure $\rightarrow$ Retry in 4s
- Attempt 3 failure $\rightarrow$ Retry in 8s
- Reaching `maxRetries` $\rightarrow$ Mark permanently as `FAILED` with `errorMessage`

### Watchdog Stale Lock Recovery
If a worker crashes while processing a job, `queueService.resetStaleLocks(60000)` automatically releases locks older than 60 seconds and re-queues the job.

---

## 🌐 5. Endpoints Reference

---

### 1. List Failure Classifications
- **Endpoint**: `GET /api/v1/classifications`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT` (Scoped to own merchant)
- **Query Parameters**:
  - `category`: Filter by canonical category (e.g. `INSUFFICIENT_FUNDS`).
  - `source`: Filter by classification source (`RULE_BASED`, `ML`, `MANUAL`).
  - `isoCode`: Filter by ISO response code (e.g. `51`).
  - `minConfidence`: Minimum confidence threshold (e.g. `0.9`).
  - `page`, `limit`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 },
    "classifications": [
      {
        "_id": "64b1f2e3d4c5b6a789012501",
        "payment": {
          "paymentId": "pay_stripe_tx_1001",
          "amount": 250.0,
          "currency": "USD",
          "status": "FAILED",
          "rawFailureReason": "card_declined_insufficient_funds"
        },
        "rawText": "card_declined_insufficient_funds",
        "normalizedText": "card declined insufficient funds",
        "predictedCategory": "INSUFFICIENT_FUNDS",
        "isoCode": "51",
        "confidence": 0.95,
        "source": "RULE_BASED",
        "modelVersion": "rule-engine-v1"
      }
    ]
  }
  ```

---

### 2. Manual Classification Override
- **Endpoint**: `PATCH /api/v1/classifications/:paymentId/override`
- **Access**: `ADMIN`, `SUPPORT` Only
- **Request Body**:
  ```json
  {
    "predictedCategory": "FRAUD_SUSPECTED",
    "isoCode": "59"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Failure classification overridden successfully",
    "classification": {
      "predictedCategory": "FRAUD_SUSPECTED",
      "isoCode": "59",
      "confidence": 1.0,
      "source": "MANUAL",
      "reviewedBy": "64b1f2e3d4c5b6a789012345",
      "reviewedAt": "2026-08-27T16:45:00.000Z"
    }
  }
  ```

---

### 3. Monitor Queue Jobs
- **Endpoint**: `GET /api/v1/queue/jobs`
- **Access**: `ADMIN`, `SUPPORT` Only
- **Query Parameters**: `status`, `jobType`, `paymentId`
- **Success Response (200 OK)**: Returns real-time status of pending, processing, completed, and failed background jobs.

---

### 4. Trigger Queue Processing Batch
- **Endpoint**: `POST /api/v1/queue/process?limit=10`
- **Access**: `ADMIN`, `SUPPORT` Only
- **Success Response (200 OK)**: Drains up to `limit` pending jobs and returns `{ success: true, message: 'Processed 5 background jobs' }`.

---

## 🤖 6. Python ML Microservice Bridge Interface

The backend is architected with a decoupled ML client bridge in [`services/mlClient.service.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/services/mlClient.service.js):

- **Environment Variable**: `ML_SERVICE_URL` (e.g. `http://localhost:8000`).
- **Graceful Degradation**: If `ML_SERVICE_URL` is empty, or the Python container is offline/unreachable, or request times out (2000ms), the system logs a warning and seamlessly falls back to the deterministic rule engine without dropping or delaying payment operations.

---

## 🧪 7. Automated Test Suite & Verification Results

File: [`backend/test-classification.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/test-classification.js)

### Execution Output:
```
====================================================
PAYGUARD FAILURE CLASSIFICATION & QUEUE WORKER TEST SUITE
====================================================

1. Testing Text Normalization...
  [PASS] normalizeFailureText cleans punctuation, hyphens, underscores
  [PASS] normalizeFailureText handles mixed casing, slashes, extra spaces

2. Testing ISO 8583 Taxonomy Utilities...
  [PASS] ISO code 51 maps to INSUFFICIENT_FUNDS
  [PASS] ISO code 51 provides 1.0 confidence
  [PASS] ISO code 54 maps to CARD_EXPIRED
  [PASS] ISO code 59 maps to FRAUD_SUSPECTED
  [PASS] ISO code 96 maps to SYSTEM_ERROR
  [PASS] extractIsoCodeFromText extracts 2-digit ISO code from text
  [PASS] extractIsoCodeFromText extracts prefixed ISO token

3. Testing Rule-Based Classification Engine...
  [PASS] card_declined_insufficient_funds classifies as INSUFFICIENT_FUNDS
  [PASS] INSUFFICIENT_FUNDS classification confidence >= 0.9
  [PASS] card validity has expired classifies as CARD_EXPIRED
  [PASS] 3DS failure classifies as AUTHENTICATION_FAILED
  [PASS] suspected fraud classifies as FRAUD_SUSPECTED
  [PASS] gateway timeout classifies as NETWORK_TIMEOUT
  [PASS] daily limit exceeded classifies as LIMIT_EXCEEDED
  [PASS] invalid card number classifies as INVALID_DETAILS
  [PASS] metadata ISO code 51 overrides generic decline
  [PASS] Direct metadata ISO code achieves 1.0 confidence
  [PASS] Unrecognized failure falls back to OTHERS
  [PASS] Fallback confidence is set to 0.5

4. Testing ML Bridge Interface...
  [PASS] ML bridge gracefully returns null when ML microservice is unconfigured

5. Testing HTTP Classification & Queue Endpoints...
  [PASS] GET /classifications without token returns 401 Unauthorized
  [PASS] GET /classifications/:paymentId without token returns 401 Unauthorized
  [PASS] PATCH /classifications/:paymentId/override without token returns 401 Unauthorized
  [PASS] GET /queue/jobs without token returns 401 Unauthorized
  [PASS] POST /queue/process without token returns 401 Unauthorized

====================================================
ALL 27/27 CLASSIFICATION TESTS PASSED!
====================================================
```

---

## 📊 8. Overall Platform Verification Matrix

| Module / Test Suite | Purpose | Tests | Status |
| :--- | :--- | :---: | :---: |
| **`test-models.js`** | 8 Mongoose Schemas, Soft Deletes, TTL, Compound Indexes | 46 | ✅ **PASS (46/46)** |
| **`test-foundation.js`**| Express Architecture, AppError, Logger, Health Telemetry | 35 | ✅ **PASS (35/35)** |
| **`test-auth.js`** | Bcrypt, JWT, Validators, Protect, RestrictTo RBAC, Login, Me | 21 | ✅ **PASS (21/21)** |
| **`test-merchants.js`** | Tenant Isolation, Config Patching, Statuses, Audit Logs | 19 | ✅ **PASS (19/19)** |
| **`test-webhooks.js`** | HMAC-SHA256, Idempotency, Ledger Storage, Job Queueing | 23 | ✅ **PASS (23/23)** |
| **`test-classification.js`**| Text Normalizer, ISO 8583, Rule Engine, ML Bridge, Queue | 27 | ✅ **PASS (27/27)** |
| **Total** | **Full PayGuard Platform Regression** | **171** | ✅ **100% PASSING** |
