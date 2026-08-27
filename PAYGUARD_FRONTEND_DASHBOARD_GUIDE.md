# 🖥️ PayGuard — Frontend Dashboard & Operations Portal Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Complete reference for the modern Apple Glassmorphism React frontend, role-aware routing, interactive analytics charts (Recharts), live webhook simulation, failure taxonomy inspection, and report center exports.

---

## 📌 1. Frontend Architecture & Aesthetics

The PayGuard Dashboard is built with **React 18 + Vite**, **Tailwind CSS**, **Recharts**, and **Lucide Icons**, following an **Apple Frosted Glass design system**:
- **Frosted Glass Cards (`backdrop-blur-2xl`, `border-white/10`, `bg-slate-900/60`)**
- **Ambient Glowing Accents & Soft Drop Shadows**
- **Live Telemetry & Webhook Simulation Suite**
- **Role-Aware Multi-Tenant Navigation (`ADMIN`, `SUPPORT`, `MERCHANT`)**

```
                          Client Web Browser
                         (React 18 Single Page)
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ AuthProvider (Context)   │
                     │ - Token in localStorage  │
                     │ - Auto-attaches Bearer   │
                     │ - Role-based permissions │
                     └──────────────────────────┘
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │ ProtectedRoute Guard     │
                     └──────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
            [Public: /login]          [DashboardLayout]
                                       ├── Top Navbar (Live Status)
                                       ├── Apple Glass Sidebar
                                       └── Page Router:
                                           ├── /dashboard
                                           ├── /merchants
                                           ├── /payments
                                           ├── /classifications
                                           ├── /analytics
                                           ├── /reports
                                           └── /settings
```

---

## 📂 2. Frontend Directory Structure

```
frontend/
├── package.json                    # React 18, Vite, Tailwind, Recharts, Lucide, Axios
├── vite.config.js                  # Proxy configuration to backend (:5000)
├── tailwind.config.js              # Apple Glass design tokens and glow utilities
├── index.html                      # HTML root with typography fonts
└── src/
    ├── main.jsx                    # React 18 DOM mount
    ├── App.jsx                     # Route definitions and AuthProvider wrapper
    ├── index.css                   # Glassmorphism utilities, scrollbars, and animations
    ├── api/
    │   ├── client.js               # Axios instance with auth interceptors & error handler
    │   ├── auth.api.js             # Login, profile, logout, password change
    │   ├── merchants.api.js        # Merchant list, CRUD, configuration, status toggle
    │   ├── webhooks.api.js         # Event history, event replay, simulation generator
    │   ├── classifications.api.js  # Taxonomy queries, manual override, queue processing
    │   ├── analytics.api.js        # Summary KPIs, trends, categories, gateway/bank stats
    │   └── reports.api.js          # Report generator, list, direct file download
    ├── context/
    │   └── AuthContext.jsx         # Global state: user, token, roles, session persistence
    ├── routes/
    │   └── ProtectedRoute.jsx      # Authentication and role guards
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.jsx          # Live engine status, active tenant indicator, user card
    │   │   ├── Sidebar.jsx         # Collapsible glass sidebar with role filtering
    │   │   └── DashboardLayout.jsx # Master page shell
    │   └── ui/
    │       ├── Card.jsx            # Apple glass container with icon & actions
    │       ├── StatCard.jsx        # KPI stat card with glowing icon & trend badge
    │       ├── Badge.jsx           # Status badge with glow & dot indicator
    │       ├── Button.jsx          # Primary gradient, secondary glass, danger, ghost
    │       ├── Input.jsx           # Glass input with search icons and error helpers
    │       ├── Modal.jsx           # Frosted glass dialog with animated backdrop
    │       └── EmptyState.jsx      # Clean zero-data placeholders & skeleton loaders
    └── pages/
        ├── LoginPage.jsx           # Glass login card with demo 1-click credentials
        ├── DashboardPage.jsx       # Real-time KPIs, velocity charts, and simulator
        ├── MerchantsPage.jsx       # Multi-tenant directory, config viewer, creation modal
        ├── PaymentsPage.jsx        # Searchable transaction ledger with raw decline details
        ├── ClassificationsPage.jsx # ISO 8583 taxonomy list & manual override modal
        ├── AnalyticsPage.jsx       # Recharts area graphs, processor & bank breakdowns
        ├── ReportsPage.jsx         # Report generator modal, 5 export types, downloads
        └── SettingsPage.jsx        # Profile view, password management, cryptographic info
```

---

## 🎯 3. Core Pages & Features

### 1. Login Page (`/login`)
- Glassy centered login card with glowing ambient backdrop.
- **One-Click Demo Presets**:
  - `Super Admin` (`admin@payguard.io` / `Admin@123456`)
  - `Support Ops` (`support@payguard.io` / `Support@123456`)
- Error alerts on invalid credentials and automatic session restoration.

### 2. Operations Command Center (`/dashboard`)
- **Executive KPI Cards**: Processed Volume (GMV), Success Rate, Failed Transactions, Active Merchants.
- **Payment Velocity & Outcome Trend Chart**: Recharts `AreaChart` with cyan and rose gradients.
- **Failure Category Distribution**: Recharts `PieChart` breaking down normalized error domains.
- **Live Webhook Simulator Modal**: Lets users generate signed payment events directly from the UI and watch the dashboard update live!

### 3. Merchant Accounts & Scopes (`/merchants`)
- Directory of all onboarded merchant tenants with search and status filters.
- **Configuration Inspector**: View retry policies, default currency, and webhook secrets.
- **Admin Onboarding Modal**: Register new merchant accounts with custom codes and gateway assignments.

### 4. Payments Financial Ledger (`/payments`)
- Searchable transaction log with filters for Gateways (`Stripe`, `Razorpay`, `Adyen`, `PayPal`) and Statuses (`Success`, `Failed`, `Pending`, `Refunded`).
- **Inspection Modal**: View customer references, exact dollar amounts, issuing banks, and raw gateway decline messages.

### 5. Failure Taxonomy & Classification (`/classifications`)
- Displays classified payment errors with their normalized category, ISO 8583 response code (`51`, `54`, `05`, `59`), confidence score, and classification source (`RULE_BASED`, `ML`, `MANUAL`).
- **Manual Override Action**: Allows Admins and Support operators to correct a classification with 1.0 confidence.
- **Process Pending Queue Jobs**: Triggers background workers directly from the interface.

### 6. Analytics Aggregation Engine (`/analytics`)
- Multi-dimensional aggregation graphs grouped by `Hour`, `Day`, `Week`, or `Month`.
- Processor reliability benchmarks (success/failure rates per gateway).
- Issuing bank decline frequency table (Chase, Bank of America, Wells Fargo).
- Merchant revenue leaderboard.

### 7. Operational Report Center (`/reports`)
- Comprehensive export table with row counts, file sizes, and 7-day TTL retention tags.
- **Report Generation Modal**: Supports 5 domains (`TRANSACTION_SUMMARY`, `FAILURE_ANALYSIS`, `MERCHANT_RECONCILIATION`, `GATEWAY_PERFORMANCE`, `AUDIT_TRAIL`) in `CSV` or `XLSX`.
- **Direct Download**: Single-click browser file streaming.

### 8. Platform & Account Settings (`/settings`)
- Displays current user profile, email, and role scope.
- Password change interface with length and matching validation.
- Cryptographic status indicator (Bcrypt 12, HMAC-SHA256, Mongo TTLs).

---

## 🔒 4. Role-Based Navigation & Access Scopes

| User Role | Permitted Pages | Scoping Rules |
| :--- | :--- | :--- |
| **`ADMIN`** | Full access to all 7 pages | Can view global analytics, create merchants, override classifications, trigger queues, and download any report. |
| **`SUPPORT`** | All pages | Can inspect operational data, triage merchant settings, override classifications, and run reports. |
| **`MERCHANT`** | Scoped access | Automatically and strictly restricted to own merchant data across Dashboard, Payments, Analytics, and Reports. |

---

## 🚀 5. How to Run the Frontend Locally

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Start Vite Development Server
npm run dev

# 3. Open in Browser
# http://localhost:5173
```
*Note: API calls to `/api/v1` are automatically proxied by Vite to the backend running on `http://localhost:5000`.*
