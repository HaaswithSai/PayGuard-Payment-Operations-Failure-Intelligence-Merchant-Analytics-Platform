# 🛡️ PayGuard: Payment Operations, Failure Intelligence & Merchant Analytics Platform

> **Real-Time Payment Operations, Webhook Ingestion, ML Failure Intelligence, and Multi-Tenant Analytics Engine**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal.svg)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📌 Executive Overview

**PayGuard** is an enterprise-grade B2B payment operations and analytics platform designed to solve payment failure blindspots across multi-processor environments (Stripe, Adyen, Razorpay, PayPal). 

It ingests high-volume asynchronous webhook events, verifies cryptographic HMAC signatures, classifies failure reasons using NLP and ISO 8583 response taxonomies, detects operational anomalies, provides high-performance MongoDB aggregation metrics, and generates downloadable audit/reconciliation reports.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────┐
                               │   Web Browser Client   │
                               │ (React 18 / Vite / UI) │
                               └───────────┬────────────┘
                                           │
                                           ▼ (REST / JWT)
                               ┌────────────────────────┐
                               │   PayGuard Core API    │
                               │ (Node.js / Express.js) │
                               └──────┬──────────┬──────┘
                                      │          │
                     ┌────────────────┘          └────────────────┐
                     │ (Internal HTTP)                            │ (Mongoose Driver)
                     ▼                                            ▼
       ┌───────────────────────────┐                ┌───────────────────────────┐
       │   AI & ML Microservice    │                │       MongoDB Atlas       │
       │   (Python 3.12 / FastAPI) │                │  (8 Indexed Schemas /     │
       │  - TF-IDF + LogisticReg   │                │   Aggregations & TTL)     │
       │  - IsolationForest Anomaly│                └───────────────────────────┘
       └───────────────────────────┘
```

---

## ✨ Key Platform Features

### 1. 🖥️ Apple Frosted Glass UI Dashboard
- **Glassmorphism Design System**: Built with Tailwind CSS (`backdrop-blur-2xl`, glowing cyan/indigo borders, custom dark palette).
- **Interactive Visualizations**: Recharts `AreaChart` velocity metrics, processor comparison bars, and failure distribution `PieChart`.
- **Live Webhook Simulator**: Generate signed payment events and watch live telemetry populate in real time.

### 2. 🔐 Multi-Tenant RBAC & Security
- **Role-Based Access Control**:
  - `ADMIN`: Global oversight, merchant management, classification overrides, worker controls.
  - `SUPPORT`: Operational triaging, audit logging, report compilation.
  - `MERCHANT`: Strict multi-tenant data isolation.
- **Cryptographic Security**: Password hashing with Bcrypt (cost factor 12) and stateless JWT sessions.

### 3. ⚡ High-Throughput Webhook Ingestion Engine
- **HMAC-SHA256 Verification**: Cryptographic timing-safe signature checking for gateway payloads.
- **Idempotency Locking**: Prevents double-counting and duplicate processing of replayed webhook events.
- **Raw Event Journaling**: Immutable audit logs of all inbound raw JSON payloads.

### 4. 🤖 ML Failure Intelligence & Classification
- **NLP Text Normalization**: Maps raw bank decline text (`card_declined_insufficient_funds-51`) to 10 canonical categories.
- **ISO 8583 Code Normalizer**: Instant matching for standard banking codes (`51`, `54`, `05`, `59`, `61`, `96`, etc.).
- **IsolationForest Anomaly Detector**: Scores multidimensional operational vectors (spikes, retry loops, off-hour velocity) to flag risk.
- **Operator Overrides**: Manual corrections with continuous active-learning retraining.

### 5. 📊 Analytics & Reporting Engine
- **MongoDB Aggregation Pipelines**: Multi-faceted `$facet` groupings by hour, day, week, or month.
- **Issuing Bank & Gateway Benchmarks**: Pinpoint decline rate spikes by bank (Chase, BoA) and processor.
- **Report Generation Subsystem**: Export transaction summaries, failure analyses, and reconciliation ledgers in RFC 4180 **CSV** and **Excel XML**.

---

## 📂 Repository Structure

```
PayGuard/
├── backend/                        # Node.js + Express Core API
│   ├── src/
│   │   ├── config/                 # DB, environment, and seed configs
│   │   ├── controllers/            # Auth, merchants, webhooks, analytics, reports
│   │   ├── middleware/             # Auth, RBAC, error handling, rate limiting
│   │   ├── models/                 # Mongoose schemas (8 collections)
│   │   ├── routes/                 # Express API route definitions
│   │   ├── services/               # Business logic & ML bridge client
│   │   ├── utils/                  # Cryptography, CSV/Excel serializers, math
│   │   └── workers/                # Background queue consumers
│   └── package.json
├── frontend/                       # React 18 + Vite Dashboard
│   ├── src/
│   │   ├── api/                    # Axios API client with interceptors
│   │   ├── components/             # Apple glass UI components & layouts
│   │   ├── context/                # AuthContext state management
│   │   ├── pages/                  # 8 functional operational pages
│   │   └── App.jsx
│   ├── vercel.json                 # Vercel SPA rewrite rules
│   └── package.json
├── ml-service/                     # Python 3.12 + FastAPI AI Microservice
│   ├── app.py                      # FastAPI REST application
│   ├── data/                       # Synthetic bootstrap training datasets
│   ├── models/                     # Serialized scikit-learn model artifacts
│   ├── schemas/                    # Pydantic data contracts
│   ├── services/                   # Classification & anomaly inference
│   ├── utils/                      # Text normalizers, feature scalers, trainer
│   └── requirements.txt
├── render.yaml                     # 1-Click Render Infrastructure Blueprint
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, Axios |
| **Backend API** | Node.js, Express.js, Mongoose, Winston, Helmet, Compression, Bcrypt, JWT |
| **AI / ML** | Python 3.12, FastAPI, Scikit-Learn (TF-IDF, LogisticRegression, IsolationForest), Joblib, Pydantic |
| **Database** | MongoDB Atlas / Local MongoDB |
| **Deployment** | Vercel (Frontend), Render (Backend & ML), MongoDB Atlas (Database) |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB running locally or a MongoDB Atlas URI

---

### 2. Start Python AI Microservice (Port 8000)
```bash
cd ml-service
pip install -r requirements.txt
python app.py
# Running at http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

---

### 3. Start Node.js Backend API (Port 5000)
```bash
cd backend
npm install
npm run seed:admin   # Seeds default Super Admin: admin@payguard.io / Admin@123456
npm run dev
# Running at http://localhost:5000
# Health Check: http://localhost:5000/api/v1/health
```

---

### 4. Start React Frontend Dashboard (Port 5173)
```bash
cd frontend
npm install
npm run dev
# Accessible at http://localhost:5173
```

---

## 🌐 Production Cloud Deployment

### 1. Database (MongoDB Atlas)
- Create a free **M0 Cluster** on MongoDB Atlas.
- Whitelist `0.0.0.0/0` under Network Access.
- Copy your connection string (`mongodb+srv://...`).

### 2. Backend & AI Services (Render)
- Connect this GitHub repository on [Render](https://render.com/) via **New + $\rightarrow$ Blueprint**.
- Render reads `render.yaml` and deploys:
  - `payguard-api` (Node.js)
  - `payguard-ml` (Python FastAPI)
- Set `MONGODB_URI` to your Atlas URI.

### 3. Frontend (Vercel)
- Import the repo on [Vercel](https://vercel.com/) with **Root Directory** set to `frontend`.
- Set Environment Variable: `VITE_API_URL=https://<your-render-backend-url>/api/v1`.
- Deploy!

---

## 🧪 Testing & Verification

The repository includes **267 automated tests** spanning all tiers:

```bash
# Run all Node.js backend & master E2E test suites (251 tests)
cd backend
node test-models.js; node test-foundation.js; node test-auth.js; node test-merchants.js; node test-webhooks.js; node test-classification.js; node test-analytics.js; node test-reports.js; node test-e2e.js

# Run Python AI test suite (16 tests)
cd ml-service
python -m pytest tests -v
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
