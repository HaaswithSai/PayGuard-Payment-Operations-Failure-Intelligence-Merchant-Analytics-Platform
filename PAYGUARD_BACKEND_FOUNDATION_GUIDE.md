# 🛡️ PayGuard — Complete Backend Foundation Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Comprehensive architectural reference for the Express application structure, configuration layer, database connection pooling, production middleware stack, error handling, logging, and server bootstrap.

---

## 📌 1. High-Level Backend Foundation Architecture

The PayGuard backend is designed around a clean, layered pipeline where every incoming HTTP request passes through a standardized security, compression, logging, and routing pipeline before reaching controller handlers and database models.

```
                           Incoming Client HTTP Request
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. Security & Edge Middlewares                        │
│  ├── Helmet (Secure HTTP Headers)                                           │
│  ├── CORS (Cross-Origin Resource Sharing whitelist)                         │
│  ├── Rate Limiter (IP-based brute-force & DDoS protection)                  │
│  └── Gzip Compression (Fast payload transmission)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     2. Telemetry & Body Parsing Layer                       │
│  ├── Request Logger (Structured Morgan + Winston logging with redaction)     │
│  ├── Express JSON Parser (10MB limit)                                       │
│  └── Express URL-Encoded Parser (10MB limit)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          3. Routing & Handlers                              │
│  ├── GET / (Service metadata & active endpoints)                            │
│  ├── GET /health & GET /api/v1/health (Uptime, Memory, DB status)           │
│  └── [Future Feature Routes] (Auth, Webhooks, Payments, Reports)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ (If unmapped route)
┌─────────────────────────────────────────────────────────────────────────────┐
│                          4. 404 Not Found Handler                           │
│  └── notFound.js (Creates standardized AppError with NOT_FOUND code)        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ (On error or next(err))
┌─────────────────────────────────────────────────────────────────────────────┐
│                     5. Centralized Error Handling                           │
│  └── errorHandler.js (Normalizes Mongoose, Mongo 11000, Cast, Syntax, 500s) │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                         Standardized JSON Response
```

---

## 📂 2. Backend Directory Layout

```
backend/
├── package.json                 # Node dependencies, scripts, and engine specifications
├── .env.example                 # Template for required environment variables
├── .env                         # Local development environment configuration
├── .gitignore                   # Ignore rules for node_modules, logs, and secrets
├── test-foundation.js           # Integration test suite for backend foundation (35/35 passing)
├── test-models.js               # Offline schema & index verification suite (46/46 passing)
└── src/
    ├── app.js                   # Express application setup and middleware pipeline
    ├── server.js                # Server bootstrap, DB connection, and graceful shutdown
    ├── index.js                 # Central package export (models, enums, config, app, utils)
    ├── config/
    │   ├── env.js               # Environment loader, type validator, and frozen config
    │   └── db.js                # Mongoose connection pool manager with event listeners
    ├── constants/
    │   └── enums.js             # Centralized domain enums (Roles, Gateways, Statuses)
    ├── middleware/
    │   ├── errorHandler.js      # Global error normalization & client response formatter
    │   ├── notFound.js          # 404 unmapped route interceptor
    │   └── requestLogger.js     # HTTP request logger with sensitive parameter redaction
    ├── utils/
    │   ├── AppError.js          # Custom operational error class
    │   ├── asyncHandler.js      # Route handler wrapper eliminating try/catch blocks
    │   └── logger.js            # Structured Winston logger (Colorized dev / JSON prod)
    ├── routes/
    │   └── health.routes.js     # Health check & database connectivity telemetry endpoint
    └── models/
        ├── User.js              # Identity & RBAC model
        ├── Merchant.js          # Tenant configuration model
        ├── WebhookEvent.js      # Ingestion buffer model
        ├── Payment.js           # Transaction ledger model
        ├── FailureClassification.js # Error taxonomy model
        ├── ProcessingQueue.js   # Background job queue model
        ├── AuditLog.js          # Compliance audit trail model
        ├── Report.js            # Report export metadata model
        └── index.js             # Central Mongoose model registry
```

---

## ⚙️ 3. Environment & Configuration Layer

### 3.1. Environment Configuration (`config/env.js`)
**File Link**: [`backend/src/config/env.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/config/env.js)

#### 🎯 What It Does
Loads environment variables using `dotenv`, validates integer types for ports and rate limits, falls back to safe development defaults, and freezes the configuration object to prevent runtime mutations.

#### 📋 Configuration Keys
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `Number` | `5000` | HTTP port the Express server listens on. |
| `NODE_ENV` | `String` | `'development'` | Runtime environment (`development`, `production`, `test`). |
| `MONGODB_URI` | `String` | `'mongodb://localhost:27017/payguard'` | MongoDB connection string. |
| `CORS_ORIGIN` | `String` | `'*'` | Allowed cross-origin domains (comma-separated or `*`). |
| `LOG_LEVEL` | `String` | `'debug'` (dev) / `'info'` (prod) | Minimum logging severity. |
| `RATE_LIMIT_WINDOW_MS` | `Number` | `900000` (15 mins) | Time window for IP rate limiting. |
| `RATE_LIMIT_MAX` | `Number` | `1000` | Max requests allowed per window per IP. |
| `isProduction` | `Boolean` | `NODE_ENV === 'production'` | Helper flag for conditional production logic. |
| `isDevelopment` | `Boolean` | `NODE_ENV === 'development'` | Helper flag for development-specific diagnostics. |
| `isTest` | `Boolean` | `NODE_ENV === 'test'` | Helper flag for automated test suites. |

#### ✨ Enterprise Additionals Added
- **Object Freezing (`Object.freeze`)**: Guarantees configuration immutability across the codebase.
- **Derived Boolean Flags**: `isProduction`, `isDevelopment`, and `isTest` eliminate error-prone string comparisons in business logic.

---

## 🗄️ 4. Database Connection & Lifecycle Management

### 4.1. MongoDB Connection Manager (`config/db.js`)
**File Link**: [`backend/src/config/db.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/config/db.js)

#### 🎯 What It Does
Manages the Mongoose connection lifecycle with enterprise connection pooling, socket timeouts, reconnection event listeners, and safe startup exit handling.

#### 📋 Connection Parameters
```javascript
const mongooseOptions = {
  maxPoolSize: 10,             // Maintain up to 10 concurrent socket connections
  minPoolSize: 2,              // Maintain at least 2 warm connections
  serverSelectionTimeoutMS: 5000, // Timeout after 5s if MongoDB is unreachable on startup
  socketTimeoutMS: 45000,      // Close inactive sockets after 45 seconds
  family: 4,                   // Force IPv4 for reliable DNS resolution
  autoIndex: !env.isProduction, // Disable index building in production for faster startup
};
```

#### ✨ Enterprise Additionals Added
1. **Connection Pooling (`maxPoolSize: 10`, `minPoolSize: 2`)**: Reuses socket connections to minimize TCP handshake overhead on high-frequency webhook traffic.
2. **Lifecycle Event Observers**:
   - `connected`: Logs successful host and database name.
   - `disconnected`: Emits warning and triggers automatic driver reconnection.
   - `reconnected`: Logs recovery when connectivity is restored.
   - `error`: Captures and logs runtime database driver exceptions.
3. **Graceful Disconnection (`disconnectDB()`)**: Flushes pending operations and closes connections cleanly during server shutdowns.

---

## 🛠️ 5. Utility Helpers Layer

---

### 5.1. Operational Error Handler (`utils/AppError.js`)
**File Link**: [`backend/src/utils/AppError.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/utils/AppError.js)

#### 🎯 What It Does
A custom operational error class extending native JavaScript `Error`. Differentiates predictable operational errors (e.g. invalid inputs, unauthorized actions, duplicate records) from unhandled programmer bugs.

#### 📋 Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `statusCode` | `Number` | HTTP status code (400, 401, 403, 404, 409, 500). |
| `status` | `String` | `'fail'` for 4xx client errors; `'error'` for 5xx server errors. |
| `isOperational` | `Boolean` | Always `true` to distinguish operational errors from system crashes. |
| `code` | `String` | Machine-readable error code (e.g., `'NOT_FOUND'`, `'VALIDATION_FAILED'`). |
| `details` | `Array` \| `Object` | Optional field-level validation errors or metadata. |

---

### 5.2. Async Handler Wrapper (`utils/asyncHandler.js`)
**File Link**: [`backend/src/utils/asyncHandler.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/utils/asyncHandler.js)

#### 🎯 What It Does
Higher-order function wrapping async route handlers and middleware. Catches any rejected promises or thrown exceptions and automatically passes them to Express `next(err)`.

#### 📋 Code Implementation
```javascript
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

---

### 5.3. Structured Logger (`utils/logger.js`)
**File Link**: [`backend/src/utils/logger.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/utils/logger.js)

#### 🎯 What It Does
Winston-based logging utility providing human-readable colorized logs in development and structured JSON output in production for ingest by CloudWatch, Datadog, or ELK.

#### ✨ Features
- **Environment-Aware Formatting**: Colorized strings in development; JSON formatted in production.
- **Morgan Stream Adapter (`logger.stream`)**: Allows HTTP request logging to stream directly into Winston.
- **Stack Trace Capture**: Automatically formats error stack traces across log entries.

---

## 🛡️ 6. Production Middleware Stack

---

### 6.1. Request Logger Middleware (`middleware/requestLogger.js`)
**File Link**: [`backend/src/middleware/requestLogger.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/middleware/requestLogger.js)

#### 🎯 What It Does
Logs all incoming HTTP requests including HTTP method, URL, status code, response time in milliseconds, content length, remote IP, and user-agent.

#### ✨ Enterprise Additionals Added
- **Credential Redaction**: Automatically redacts sensitive fields (`password`, `passwordHash`, `webhookSecret`) before writing logs.
- **Probe Skipping**: Optionally skips repetitive `GET /health` polling in production to keep logs clean.

---

### 6.2. 404 Catch-All Middleware (`middleware/notFound.js`)
**File Link**: [`backend/src/middleware/notFound.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/middleware/notFound.js)

#### 🎯 What It Does
Intercepts any HTTP request that does not match an existing route and forwards an `AppError` with a `404` status code and `NOT_FOUND` error code to the global error handler.

---

### 6.3. Centralized Error Handler (`middleware/errorHandler.js`)
**File Link**: [`backend/src/middleware/errorHandler.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/middleware/errorHandler.js)

#### 🎯 What It Does
Global 4-argument Express error middleware `(err, req, res, next)` that transforms raw database and operational exceptions into clean, consistent JSON responses.

#### 📋 Standardized Error Envelope
```json
{
  "success": false,
  "status": "fail",
  "message": "Human readable description",
  "error": {
    "code": "ERROR_CODE",
    "details": null
  },
  "stack": "Error: ... (Only visible in development mode)"
}
```

#### 🔄 Automatic Error Transformations Handled:
1. **Mongoose `ValidationError`**: Extracts all invalid fields into `error.details` and responds with `400 VALIDATION_FAILED`.
2. **MongoDB `11000` Duplicate Key Error**: Identifies the duplicate field name/value and responds with `409 DUPLICATE_RESOURCE`.
3. **Mongoose `CastError` (Invalid ObjectId)**: Responds with `400 INVALID_FIELD_VALUE`.
4. **Express Malformed JSON SyntaxError**: Responds with `400 INVALID_JSON`.
5. **Generic / Uncaught Errors (500)**: Logs the full error stack with Winston, but returns a generic safe message in production to prevent internal information disclosure.

---

## 🚀 7. Application & Server Bootstrap

---

### 7.1. Express App Setup (`src/app.js`)
**File Link**: [`backend/src/app.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/app.js)

#### 🎯 What It Does
Initializes the Express application and arranges the middleware pipeline in strict execution order:

1. `helmet()` — Secures HTTP headers (XSS filter, Clickjacking protection, HSTS).
2. `cors()` — Configures allowed origins, credentials, and headers (`X-Correlation-Id`, `X-Request-Id`).
3. `rateLimit()` — Limits IPs to 1000 requests per 15 minutes.
4. `compression()` — Compresses response bodies with Gzip.
5. `express.json()` & `express.urlencoded()` — Body parsing with a safe 10MB limit.
6. `requestLogger` — Logs incoming HTTP traffic.
7. Routes (`/`, `/health`, `/api/v1/health`).
8. `notFound` — Catches unmapped routes.
9. `errorHandler` — Global error handling.

---

### 7.2. Server Bootstrap & Graceful Shutdown (`src/server.js`)
**File Link**: [`backend/src/server.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/server.js)

#### 🎯 What It Does
Connects to MongoDB, binds the Express HTTP server to `env.PORT`, and manages operating system process signals for graceful shutdown.

#### ✨ Graceful Shutdown Handling:
- **`SIGTERM` & `SIGINT` (Ctrl+C / Docker Stop)**:
  1. Stops receiving new HTTP connections (`server.close()`).
  2. Waits for active in-flight requests to finish.
  3. Closes MongoDB connection pool cleanly (`disconnectDB()`).
  4. Exits process with code `0`.
- **`unhandledRejection` & `uncaughtException`**:
  - Logs critical exceptions with Winston.
  - In production, triggers graceful termination so container orchestrators (Docker, Kubernetes, PM2) can automatically restart a clean instance.

---

## 🩺 8. Health Check & Telemetry Route

### 8.1. Health Router (`routes/health.routes.js`)
**File Link**: [`backend/src/routes/health.routes.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/routes/health.routes.js)

#### 🎯 What It Does
Exposes `GET /health` and `GET /api/v1/health` for uptime monitoring, load balancer health probes, and Kubernetes liveness/readiness checks.

#### 📋 Sample Response Payload
```json
{
  "success": true,
  "status": "healthy",
  "service": "payguard-backend",
  "version": "1.0.0",
  "environment": "development",
  "uptimeSeconds": 142,
  "timestamp": "2026-08-27T15:54:35.000Z",
  "database": {
    "status": "connected",
    "readyState": 1
  },
  "system": {
    "memoryUsageMB": 38.45,
    "nodeVersion": "v24.14.0"
  }
}
```

---

## 🧪 9. Automated Test Suites & Verification

### 9.1. Foundation Integration Test Suite (`backend/test-foundation.js`)
**File Link**: [`backend/test-foundation.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/test-foundation.js)

Tests configuration loading, error utilities, async handlers, model exports, and real HTTP requests against Express routes without needing an open public port.

#### Execution Output:
```
====================================================
PAYGUARD BACKEND FOUNDATION TEST SUITE
====================================================

1. Testing Environment Configuration...
  [PASS] env.PORT is configured (5000)
  [PASS] env.NODE_ENV is configured (development)
  [PASS] env.MONGODB_URI is configured (mongodb://localhost:27017/payguard)
  [PASS] env.CORS_ORIGIN is configured (*)
  [PASS] env object is immutable (frozen)

2. Testing Error Utilities...
  [PASS] AppError extends native Error
  [PASS] AppError captures status code 404
  [PASS] AppError marks 4xx as status "fail"
  [PASS] AppError marks isOperational as true
  [PASS] AppError captures custom error code
  [PASS] AppError captures error details
  [PASS] AppError marks 5xx as status "error"

3. Testing Async Handler...
  [PASS] asyncHandler catches rejected async errors and forwards to next()

4. Testing Model Registry Exports...
  [PASS] Model registry exports User
  [PASS] Model registry exports Merchant
  [PASS] Model registry exports WebhookEvent
  [PASS] Model registry exports Payment
  [PASS] Model registry exports FailureClassification
  [PASS] Model registry exports ProcessingQueue
  [PASS] Model registry exports AuditLog
  [PASS] Model registry exports Report

5. Testing Express Routes & Middleware...
  [PASS] GET / returns HTTP 200 OK
  [PASS] GET / body includes success: true
  [PASS] GET / confirms PayGuard service name
  [PASS] GET /health returns valid status
  [PASS] GET /health returns service: payguard-backend
  [PASS] GET /health returns uptime
  [PASS] GET /health returns database telemetry
  [PASS] GET /api/v1/health returns valid status
  [PASS] GET /api/v1/health returns version 1.0.0
  [PASS] Unknown route returns HTTP 404 Not Found
  [PASS] 404 response returns success: false
  [PASS] 404 response returns error code NOT_FOUND
  [PASS] Malformed JSON returns HTTP 400 Bad Request
  [PASS] Malformed JSON returns error code INVALID_JSON

====================================================
ALL 35/35 FOUNDATION TESTS PASSED!
====================================================
```

---

## 🎯 10. Summary Matrix of Backend Foundation

| Foundation Component | Technology / Implementation | Key Advantage |
| :--- | :--- | :--- |
| **Server Engine** | Express.js 4.x + Node.js >= 18 | High-throughput, asynchronous request processing. |
| **Database Pool** | Mongoose 8.x (`maxPoolSize: 10`) | Connection reuse, automatic reconnections, zero latency spikes. |
| **Error Handling** | `AppError` + Central `errorHandler` | Uniform JSON error responses across all endpoints. |
| **Logging** | Winston + Morgan | Structured JSON in production; colorized CLI logs in development. |
| **Security** | Helmet + CORS + Rate Limit | Hardens HTTP headers, prevents unauthorized origins, mitigates DDoS. |
| **Performance** | Compression (Gzip) | Minimizes JSON payload size across networks. |
| **Health Monitoring** | `/health` with Memory & DB State | Native support for Docker, AWS ALB, and Kubernetes probes. |
