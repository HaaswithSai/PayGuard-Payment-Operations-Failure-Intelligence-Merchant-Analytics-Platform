# 📑 PayGuard — Report Generation & Cloud Storage Integration Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Complete reference for asynchronous report orchestration, storage abstraction (`LOCAL`, `S3`, `GCS`, `AZURE_BLOB`), multi-format export engines (`CSV`, `XLSX`), multi-tenant report boundaries, and secure download lifecycles.

---

## 📌 1. Report Lifecycle Architecture

The PayGuard Reporting Subsystem allows authorized users to request, compile, serialize, and securely download business-grade financial and operational reports across 5 core enterprise domains:

```
                         Report Request
                    (POST /api/v1/reports)
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 1. protect & Tenant Boundary Guard │
            │    (Merchant forced self-scope)    │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 2. Create Report Tracking Record   │
            │    (Status: 'PROCESSING')          │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 3. Report Builder Query Execution  │
            │    (Payment, Failure, AuditLog)    │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 4. Format Serialization Engine     │
            │    - RFC 4180 CSV Serializer       │
            │    - SpreadsheetML Excel Builder   │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 5. Storage Driver Abstraction      │
            │    - LOCAL (backend/storage/)      │
            │    - Cloud: S3 / GCS / Azure Blob  │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ 6. Finalize Metadata & Retention   │
            │    (Status: 'READY', TTL: 7 Days)  │
            │    (Audit: REPORT_GENERATED)       │
            └────────────────────────────────────┘
                              │
                              ▼
                     Secure Download Ready
               (GET /api/v1/reports/:id/download)
```

---

## 📂 2. Module Directory Structure

```
backend/src/
├── utils/
│   ├── csv.utils.js                # RFC 4180 CSV serializer with escaping & quotes
│   └── xlsx.utils.js               # SpreadsheetML XML builder for Microsoft Excel / Sheets
├── services/
│   ├── storage.service.js          # Pluggable storage driver (LOCAL, S3, GCS, Azure)
│   ├── reportBuilder.service.js    # Data query aggregation and column mapping
│   └── report.service.js           # Lifecycle orchestration, status updates, secure downloads
├── validators/
│   └── report.validator.js         # Payload schema validation and ObjectId parameters
├── controllers/
│   └── report.controller.js        # Thin HTTP controllers handling report endpoints
└── routes/
    └── report.routes.js            # Express routes mounted under /api/v1/reports
```

---

## 📊 3. Supported Enterprise Report Types

| Report Type | Domain / Data Sources | Extracted Columns |
| :--- | :--- | :--- |
| **`TRANSACTION_SUMMARY`** | Financial Ledger (`Payment`, `Merchant`) | Payment ID, Merchant Code, Merchant Name, Gateway, Issuing Bank, Amount, Currency, Status, Customer Ref, Processed Date |
| **`FAILURE_ANALYSIS`** | Error Diagnostics (`Payment`, `FailureClassification`) | Payment ID, Merchant Code, Gateway, Issuing Bank, Amount, Normalized Category, ISO 8583 Code, Confidence Score, Source, Raw Error |
| **`MERCHANT_RECONCILIATION`**| Settlement & Tenant Health (`Payment`, `Merchant`) | Merchant Code, Name, Email, Status, Total Transactions, Success Count, Failed Count, Success Rate (%), Total Volume (USD) |
| **`GATEWAY_PERFORMANCE`** | Processor Evaluation (`Payment`) | Gateway, Total Transactions, Success Count, Failure Count, Success Rate (%), Failure Rate (%), Total Volume, Failed Volume |
| **`AUDIT_TRAIL`** | Compliance & Tracing (`AuditLog`, `User`) | Timestamp, Action, Actor Role, User Email, Entity Type, Entity ID, IP Address, Request ID, Correlation ID |

---

## 💾 4. Pluggable Storage Abstraction Architecture

PayGuard decouples report file storage from business logic via [`services/storage.service.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/services/storage.service.js):

### Storage Drivers Matrix:
- **`LOCAL` (Default)**: Automatically creates and writes to `backend/storage/reports/`. Generates relative URI references and calculates exact byte sizes.
- **`S3` (Cloud Driver)**: Prepared for Amazon Web Services S3 buckets (`s3://payguard-reports/...`).
- **`GCS` (Cloud Driver)**: Prepared for Google Cloud Storage buckets (`gcs://payguard-reports/...`).
- **`AZURE_BLOB` (Cloud Driver)**: Prepared for Azure Blob Storage containers.

### Retention & TTL Policy:
Every generated report document sets `expiresAt: new Date(Date.now() + 7 * 86400 * 1000)` (7 days), aligned with the MongoDB sparse TTL index on `Report.expiresAt`.

---

## 🌐 5. Endpoints Reference (`/api/v1/reports`)

---

### 1. Request & Generate Report
- **Endpoint**: `POST /api/v1/reports`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT` (Merchant queries are strictly self-scoped)
- **Request Body**:
  ```json
  {
    "reportType": "TRANSACTION_SUMMARY",
    "format": "CSV",
    "filtersUsed": {
      "startDate": "2026-08-01",
      "endDate": "2026-08-27",
      "gateway": "STRIPE",
      "status": "FAILED"
    }
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Report generated successfully",
    "report": {
      "_id": "64b1f2e3d4c5b6a789012601",
      "reportType": "TRANSACTION_SUMMARY",
      "format": "CSV",
      "status": "READY",
      "storageType": "LOCAL",
      "fileLocation": "storage/reports/64b1f2e3..._Transaction_Summary_2026-08-27.csv",
      "fileSizeBytes": 4520,
      "rowCount": 35,
      "generatedAt": "2026-08-27T16:50:00.000Z",
      "expiresAt": "2026-09-03T16:50:00.000Z"
    }
  }
  ```

---

### 2. List Available Report Types & Formats
- **Endpoint**: `GET /api/v1/reports/types`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "types": [
      "TRANSACTION_SUMMARY",
      "FAILURE_ANALYSIS",
      "MERCHANT_RECONCILIATION",
      "GATEWAY_PERFORMANCE",
      "AUDIT_TRAIL"
    ],
    "formats": ["CSV", "XLSX"]
  }
  ```

---

### 3. List Generated Reports
- **Endpoint**: `GET /api/v1/reports`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT` (Merchant sees only own reports)
- **Query Parameters**: `reportType`, `status`, `page`, `limit`
- **Success Response (200 OK)**: Returns paginated list of generated report metadata.

---

### 4. Download Report File
- **Endpoint**: `GET /api/v1/reports/:id/download`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT` (Tenant-authorized)
- **HTTP Headers Returned**:
  ```http
  Content-Type: text/csv; charset=utf-8
  Content-Disposition: attachment; filename="Transaction_Summary_2026-08-27.csv"
  Content-Length: 4520
  ```
- **Response**: Binary / text file payload. Writes `AuditLog` entry for `REPORT_DOWNLOADED`.

---

### 5. Delete Report
- **Endpoint**: `DELETE /api/v1/reports/:id`
- **Access**: `ADMIN`, `SUPPORT`, `MERCHANT` (Own report only)
- **Behavior**: Unlinks physical file from storage driver and removes `Report` document.

---

## 🧪 6. Automated Test Suite & Verification Results

File: [`backend/test-reports.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/test-reports.js)

### Execution Output:
```
====================================================
PAYGUARD REPORT GENERATION & STORAGE TEST SUITE
====================================================

1. Testing CSV Serialization...
  [PASS] CSV contains escaped header line
  [PASS] CSV properly handles embedded commas
  [PASS] CSV properly escapes internal double quotes

2. Testing Excel XML Serialization...
  [PASS] Excel XML starts with XML header
  [PASS] Excel XML sets custom worksheet name
  [PASS] Excel XML formats string cell headers
  [PASS] Excel XML identifies numeric cells

3. Testing Storage Service...
  [PASS] StorageService saves to LOCAL storage
  [PASS] StorageService captures file byte size
  [PASS] StorageService returns relative fileLocation path
  [PASS] StorageService reads back identical file buffer
  [PASS] StorageService returns text/csv content type
  [PASS] StorageService returns Excel content type
  [PASS] StorageService deletes local report file cleanly

4. Testing Report Validator...
  [PASS] validateCreateReport rejects unknown reportType
  [PASS] validateCreateReport rejects unsupported format DOCX
  [PASS] validateCreateReport accepts valid request body
  [PASS] validateCreateReport normalizes format to uppercase
  [PASS] validateReportIdParam rejects non-ObjectId string

5. Testing HTTP Report Endpoints...
  [PASS] GET /api/v1/reports/types is guarded with 401 Unauthorized
  [PASS] GET /api/v1/reports is guarded with 401 Unauthorized
  [PASS] POST /api/v1/reports is guarded with 401 Unauthorized
  [PASS] GET /api/v1/reports/64b1f2e3d4c5b6a789012399 is guarded with 401 Unauthorized
  [PASS] GET /api/v1/reports/64b1f2e3d4c5b6a789012399/download is guarded with 401 Unauthorized
  [PASS] DELETE /api/v1/reports/64b1f2e3d4c5b6a789012399 is guarded with 401 Unauthorized

====================================================
ALL 25/25 REPORT TESTS PASSED!
====================================================
```

---

## 📊 7. Full Platform Verification Matrix

| Module / Test Suite | Purpose | Tests | Status |
| :--- | :--- | :---: | :---: |
| **`test-models.js`** | 8 Mongoose Schemas, Soft Deletes, TTL, Compound Indexes | 46 | ✅ **PASS (46/46)** |
| **`test-foundation.js`**| Express Architecture, AppError, Logger, Health Telemetry | 35 | ✅ **PASS (35/35)** |
| **`test-auth.js`** | Bcrypt, JWT, Validators, Protect, RestrictTo RBAC, Login, Me | 21 | ✅ **PASS (21/21)** |
| **`test-merchants.js`** | Tenant Isolation, Config Patching, Statuses, Audit Logs | 19 | ✅ **PASS (19/19)** |
| **`test-webhooks.js`** | HMAC-SHA256, Idempotency, Ledger Storage, Job Queueing | 23 | ✅ **PASS (23/23)** |
| **`test-classification.js`**| Text Normalizer, ISO 8583, Rule Engine, ML Bridge, Queue | 27 | ✅ **PASS (27/27)** |
| **`test-analytics.js`** | Aggregations, Time-Series, KPIs, Scoping, Endpoints | 24 | ✅ **PASS (24/24)** |
| **`test-reports.js`** | CSV/XLSX Builders, Storage Drivers, TTL, Downloads | 25 | ✅ **PASS (25/25)** |
| **Total** | **Full PayGuard Platform Regression** | **220** | ✅ **100% PASSING** |
