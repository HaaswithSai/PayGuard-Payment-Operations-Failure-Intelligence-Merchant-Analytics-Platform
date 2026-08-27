# 🚀 PayGuard — Master Deployment & Production Run Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Complete reference for running PayGuard locally, configuring production environments, cloud deployment on Vercel / Render / MongoDB Atlas, and executing end-to-end smoke verification.

---

## 📌 1. System Architecture & Topology

PayGuard operates as a modern, decoupled three-tier microservice architecture:

```
                      [Web Browser Client]
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ 1. Frontend Dashboard (Port: 5173 / Vercel)  │
        │    - React 18, Vite, Tailwind CSS, Recharts  │
        │    - Apple Glassmorphism Design System       │
        └──────────────────────────────────────────────┘
                               │ (REST / JSON / Bearer JWT)
                               ▼
        ┌──────────────────────────────────────────────┐
        │ 2. Backend Core API (Port: 5000 / Render)    │
        │    - Express.js Foundation & Winston Logging │
        │    - RBAC: ADMIN, SUPPORT, MERCHANT          │
        │    - Webhook Ingestion & Financial Ledger    │
        │    - Analytics Aggregation ($facet Pipeline) │
        │    - Report Generation & Storage Drivers     │
        └──────────────────────────────────────────────┘
                 │ (Internal HTTP)           │ (Mongoose Driver)
                 ▼                           ▼
 ┌──────────────────────────────┐   ┌──────────────────────────────┐
 │ 3. AI Microservice (:8000)   │   │ 4. Database (MongoDB Atlas)  │
 │    - Python 3.12 / FastAPI   │   │    - 8 Indexed Schemas       │
 │    - NLP Failure Classifier  │   │    - Compound & TTL Indexes  │
 │    - IsolationForest Anomaly │   │    - Non-repudiable Ledgers  │
 └──────────────────────────────┘   └──────────────────────────────┘
```

---

## 💻 2. Local Multi-Service Development Setup

Follow these steps to run all 3 tiers locally:

### Step 1: Python AI Microservice (Port 8000)
```bash
cd ml-service
python -m pip install -r requirements.txt
python app.py
# Running on http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

### Step 2: Node.js Backend Core (Port 5000)
```bash
cd backend
npm install
npm run seed:admin   # Seeds Super Admin: admin@payguard.io / Admin@123456
npm run dev
# Running on http://localhost:5000
# Health Check: http://localhost:5000/api/v1/health
```

### Step 3: React Frontend Dashboard (Port 5173)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

---

## ☁️ 3. Cloud Production Deployment Architecture

---

### Tier 1: Frontend Dashboard Deployment (Vercel)
1. **Platform**: [Vercel](https://vercel.com/)
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables**:
   ```env
   VITE_API_URL=https://payguard-api.onrender.com/api/v1
   ```

---

### Tier 2: Backend Core API Deployment (Render / Railway / AWS ECS)
1. **Platform**: [Render](https://render.com/) or [Railway](https://railway.app/)
2. **Environment**: `Node` (v18+)
3. **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/payguard?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_production_jwt_signing_key_32chars_min
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://payguard-dashboard.vercel.app
   ML_SERVICE_URL=https://payguard-ml.onrender.com
   ML_SERVICE_TIMEOUT_MS=2000
   LOG_LEVEL=info
   ```

---

### Tier 3: Python AI Microservice Deployment (Render / Railway)
1. **Platform**: [Render](https://render.com/) or [Railway](https://railway.app/)
2. **Environment**: `Python 3.12`
3. **Root Directory**: `ml-service`
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. **Environment Variables**:
   ```env
   ML_HOST=0.0.0.0
   ML_PORT=8000
   LOG_LEVEL=INFO
   ```

---

### Tier 4: Database Provisioning (MongoDB Atlas)
1. **Cluster**: Create a free M0 or production cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. **Network Access**: Add `0.0.0.0/0` (Allow Access from Anywhere) or whitelist Render server IPs.
3. **Database User**: Create a read/write user and copy the connection URI into `MONGODB_URI`.
4. **Initial Seeding**: Run `npm run seed:admin` once against the Atlas URI to create the initial Super Admin account.

---

## 📋 4. Environment Variables Reference Matrix

| Variable Name | Required By | Default (Dev) | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Backend | `development` | Runtime mode (`development` / `production` / `test`). |
| `PORT` | Backend | `5000` | HTTP port for the Express server. |
| `MONGODB_URI` | Backend | `mongodb://localhost:27017/payguard` | MongoDB connection URI string. |
| `JWT_SECRET` | Backend | *(Dev fallback secret)* | Cryptographic HMAC key for JWT signing. |
| `JWT_EXPIRES_IN` | Backend | `7d` | JWT session lifetime. |
| `CORS_ORIGIN` | Backend | `*` | Allowed CORS origins for web clients. |
| `ML_SERVICE_URL` | Backend | `http://localhost:8000` | Target URL for the Python AI microservice bridge. |
| `ML_SERVICE_TIMEOUT_MS`| Backend | `2000` | HTTP timeout before falling back to rule engine. |
| `VITE_API_URL` | Frontend | `/api/v1` (via Vite proxy) | Base API URL called by Axios client. |
| `ML_HOST` / `ML_PORT` | ML Service | `0.0.0.0` / `8000` | Binding host and port for FastAPI. |

---

## 🧪 5. Automated Verification Suites

The repository includes **250 automated tests** spanning all tiers:

```bash
# 1. Run Complete Node.js Test Matrix (9 Suites)
cd backend
node test-models.js; node test-foundation.js; node test-auth.js; node test-merchants.js; node test-webhooks.js; node test-classification.js; node test-analytics.js; node test-reports.js; node test-e2e.js

# 2. Run Python ML Microservice Test Matrix
cd ml-service
python -m pytest tests -v

# 3. Build & Validate Frontend Bundle
cd frontend
npm run build
```

---

## 🔍 6. Post-Deployment Smoke Test Checklist

Once deployed to production, run this 5-minute smoke test checklist:

- [ ] **1. ML Service Health**: `GET https://payguard-ml.../health` returns `{"status":"healthy","modelsLoaded":{"classifier":true}}`.
- [ ] **2. Backend Health**: `GET https://payguard-api.../api/v1/health` returns `{"status":"healthy","database":{"status":"connected"}}`.
- [ ] **3. Frontend UI**: Navigate to `https://payguard-dashboard.../login` and verify that the glassmorphism UI loads cleanly.
- [ ] **4. Login Handshake**: Sign in with `admin@payguard.io` / `Admin@123456`.
- [ ] **5. Webhook Ingestion**: Click the **"Simulate Webhook"** button on the dashboard to trigger a real transaction event.
- [ ] **6. Failure Classification**: Verify that the payment status and failure category (`INSUFFICIENT_FUNDS`, etc.) populate the dashboard feed.
- [ ] **7. Report Generation**: Navigate to `/reports`, compile a `Transaction Summary` report in `CSV` or `XLSX`, and download it.
- [ ] **8. Multi-Tenant Scoping**: Log in as a Merchant account and verify that global metrics and other merchants' records are inaccessible.
