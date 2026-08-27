# 🔐 PayGuard — Authentication & Role-Based Access Control (RBAC) Guide

> **Enterprise Payment Operations & Analytics Platform**  
> Comprehensive architectural reference for JWT authentication, bcrypt password hashing, session lifecycle, RBAC middleware, and protected endpoints.

---

## 📌 1. High-Level Authentication & RBAC Flow

PayGuard uses **stateless JSON Web Tokens (JWT)** with **cryptographic bcrypt password hashing (cost factor: 12)** and multi-tenant Role-Based Access Control (**RBAC**) for `ADMIN`, `MERCHANT`, and `SUPPORT` roles.

```
                                  Client Login
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │   POST /api/v1/auth/login        │
                     │  (email, password validation)    │
                     └──────────────────────────────────┘
                                       │
                                (Auth Service)
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
         [User Inactive/Suspended]                   [Password Match]
                 │                                           │
                 ▼ (403 Forbidden)                           ▼ (200 OK)
     { error: ACCOUNT_DISABLED }             ┌───────────────────────────────┐
                                             │  1. Reset failedLoginAttempts │
                                             │  2. Update lastLoginAt        │
                                             │  3. Sign JWT Bearer Token     │
                                             └───────────────────────────────┘
                                                             │
                                                             ▼
                                                    Client receives Token
```

```
                             Protected API Request
                         (Header: Bearer <JWT_TOKEN>)
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │   1. protect Middleware          │
                     │  - Verifies JWT Signature & Exp  │
                     │  - Ensures Account is ACTIVE     │
                     │  - Rejects if Password Changed   │
                     │  - Attaches req.user             │
                     └──────────────────────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │   2. restrictTo Middleware       │
                     │  - Checks req.user.role          │
                     │  - ['ADMIN', 'MERCHANT', ...]    │
                     └──────────────────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 [Role Permitted]              [Role Forbidden]
                        │                             │
                        ▼ (next())                    ▼ (403 Forbidden)
               Controller Handler            { error: FORBIDDEN }
```

---

## 📂 2. Auth Module Directory Structure

```
backend/src/
├── config/
│   └── env.js                   # Exports JWT_SECRET and JWT_EXPIRES_IN (default: 7d)
├── utils/
│   ├── password.js              # Bcrypt hashPassword & comparePassword helpers
│   └── jwt.js                   # JsonWebToken signToken & verifyToken helpers
├── validators/
│   └── auth.validator.js        # Input validation for login, register, change-password
├── services/
│   └── auth.service.js          # Core business logic: login, register, profile, change-password
├── middleware/
│   ├── auth.middleware.js       # 'protect' middleware (JWT verification & session check)
│   └── role.middleware.js       # 'restrictTo' middleware (RBAC role guards)
├── controllers/
│   └── auth.controller.js       # Thin HTTP controllers handling auth endpoints
└── routes/
    └── auth.routes.js           # Express route definitions for /api/v1/auth
```

---

## 🔑 3. Core Authentication Utilities

---

### 3.1. Password Utilities (`utils/password.js`)
**File Link**: [`backend/src/utils/password.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/utils/password.js)

#### 🎯 What It Does
Provides cryptographically secure password hashing and timing-safe comparisons using `bcryptjs` with a cost factor of 12.

| Function | Signature | Description |
| :--- | :--- | :--- |
| `hashPassword` | `(password: string, saltRounds = 12) => Promise<string>` | Hashes plain text passwords before storing in database. |
| `comparePassword` | `(candidate: string, hash: string) => Promise<boolean>` | Compares plaintext with stored hash safely. |

---

### 3.2. JWT Utilities (`utils/jwt.js`)
**File Link**: [`backend/src/utils/jwt.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/utils/jwt.js)

#### 🎯 What It Does
Generates and verifies cryptographic JSON Web Tokens using `jsonwebtoken` and the secret key from `env.JWT_SECRET`.

| Function | Signature | Description |
| :--- | :--- | :--- |
| `signToken` | `(payload: object, options = {}) => string` | Encodes user ID, email, role, and merchant ID into signed JWT with configurable expiration (`7d`). |
| `verifyToken` | `(token: string) => object` | Decodes and verifies token signature. Translates `TokenExpiredError` and `JsonWebTokenError` into `AppError` instances (HTTP 401). |

---

## 🛡️ 4. Middlewares: Authentication & RBAC

---

### 4.1. `protect` Middleware (`middleware/auth.middleware.js`)
**File Link**: [`backend/src/middleware/auth.middleware.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/middleware/auth.middleware.js)

#### 🎯 What It Does
Guards private endpoints by validating the Bearer token in the `Authorization` header and loading the current user record.

#### 🔄 Pipeline Steps:
1. **Token Extraction**: Reads `Authorization: Bearer <token>`. Returns `401 UNAUTHORIZED` if missing.
2. **Signature & Expiry Check**: Validates token using `verifyToken()`. Returns `401 TOKEN_EXPIRED` or `401 INVALID_TOKEN` if tampered with.
3. **Account Existence & Soft-Delete**: Checks if user exists and `isDeleted: false`. Returns `401 USER_NOT_FOUND`.
4. **Account State**: Verifies `status === 'ACTIVE'`. Returns `403 ACCOUNT_DISABLED` if `INACTIVE` or `SUSPENDED`.
5. **Password Invalidation Check**: If user changed their password after the token was issued (`lastPasswordChange > token.iat`), revokes session with `401 TOKEN_INVALIDATED`.
6. **Request Population**: Attaches `req.user` and `req.user.id` to the request object.

---

### 4.2. `restrictTo` Middleware (`middleware/role.middleware.js`)
**File Link**: [`backend/src/middleware/role.middleware.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/src/middleware/role.middleware.js)

#### 🎯 What It Does
Enforces Role-Based Access Control (**RBAC**). Compares `req.user.role` against the list of authorized roles.

#### 📋 Usage Pattern:
```javascript
// Only ADMIN can access
router.post('/admin/merchants', protect, restrictTo('ADMIN'), merchantController.create);

// ADMIN and SUPPORT can view logs
router.get('/admin/audit-logs', protect, restrictTo('ADMIN', 'SUPPORT'), auditController.list);

// MERCHANT can manage their own webhooks
router.get('/merchant/webhooks', protect, restrictTo('MERCHANT', 'ADMIN'), webhookController.list);
```

---

## 🌐 5. Endpoints Reference (`/api/v1/auth`)

---

### 1. User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@payguard.internal",
    "password": "SuperSecretPassword!2026"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64b1f2e3d4c5b6a789012345",
      "name": "Platform Administrator",
      "email": "admin@payguard.internal",
      "role": "ADMIN",
      "status": "ACTIVE",
      "merchant": null,
      "failedLoginAttempts": 0,
      "lastLoginAt": "2026-08-27T16:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request` — Missing or invalid email/password format.
  - `401 Unauthorized` — Invalid email or incorrect password.
  - `403 Forbidden` — Account is inactive or suspended.

---

### 2. User Registration / Provisioning
- **Endpoint**: `POST /api/v1/auth/register`
- **Access**: **Protected Admin Only** (`Bearer <ADMIN_JWT>` required)
- **Middleware**: `protect`, `restrictTo('ADMIN')`, `validateRegister`
- **Seeding Initial Admin**: Run `npm run seed:admin` or `node src/config/seed.js` to provision the initial Super Admin account if none exists.
- **Request Body**:
  ```json
  {
    "name": "Acme Ops Lead",
    "email": "ops@acme.com",
    "password": "SecurePassword123!",
    "role": "MERCHANT",
    "merchant": "64b1f2e3d4c5b6a789012399"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User account created successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64b1f2e3d4c5b6a789012388",
      "name": "Acme Ops Lead",
      "email": "ops@acme.com",
      "role": "MERCHANT",
      "status": "ACTIVE",
      "merchant": "64b1f2e3d4c5b6a789012399"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized` — Missing or invalid Bearer token.
  - `403 Forbidden` — Authenticated user does not have `ADMIN` role.
  - `400 Bad Request` — Validation failed (e.g. password < 8 chars, missing merchant for MERCHANT role).
  - `409 Conflict` — User email already exists.

---

### 3. Get Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Access**: Private (`Bearer <TOKEN>` required)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "64b1f2e3d4c5b6a789012345",
      "name": "Platform Administrator",
      "email": "admin@payguard.internal",
      "role": "ADMIN",
      "status": "ACTIVE",
      "merchant": null,
      "failedLoginAttempts": 0,
      "lastLoginAt": "2026-08-27T16:00:00.000Z"
    }
  }
  ```

---

### 4. User Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Access**: Private (`Bearer <TOKEN>` required)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully. Please clear the authorization token from client storage."
  }
  ```

---

### 5. Change Password
- **Endpoint**: `POST /api/v1/auth/change-password`
- **Access**: Private (`Bearer <TOKEN>` required)
- **Request Body**:
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewStrongPassword2026!",
    "confirmPassword": "NewStrongPassword2026!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64b1f2e3d4c5b6a789012388",
      "name": "Acme Ops Lead",
      "email": "ops@acme.com",
      "role": "MERCHANT",
      "status": "ACTIVE"
    }
  }
  ```

---

## 🧪 6. Test Suite & Verification Results

File: [`backend/test-auth.js`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/backend/test-auth.js)

### Execution Output:
```
====================================================
PAYGUARD AUTHENTICATION & RBAC TEST SUITE
====================================================

1. Testing Password Hashing & Comparison...
  [PASS] Bcrypt generates valid salt and hash format
  [PASS] Hashed password is not plain text
  [PASS] comparePassword returns true for correct password
  [PASS] comparePassword returns false for incorrect password

2. Testing JWT Utilities...
  [PASS] signToken generates valid 3-part JWT
  [PASS] verifyToken recovers embedded user ID
  [PASS] verifyToken recovers user role
  [PASS] verifyToken throws 401 INVALID_TOKEN on tampered tokens

3. Testing RestrictTo RBAC Middleware...
  [PASS] restrictTo(ADMIN) allows ADMIN user through
  [PASS] restrictTo(ADMIN) blocks MERCHANT user with 403 FORBIDDEN
  [PASS] restrictTo(ADMIN, SUPPORT) allows SUPPORT user through

4. Testing Protect Middleware...
  [PASS] protect blocks request without Authorization header with 401 UNAUTHORIZED

5. Testing HTTP Auth Endpoints (Validation & Response format)...
  [PASS] POST /login with empty body returns 400 Bad Request
  [PASS] POST /login returns VALIDATION_ERROR code
  [PASS] POST /login rejects malformed email format
  [PASS] POST /register rejects password shorter than 8 characters
  [PASS] POST /register enforces merchant reference for MERCHANT role
  [PASS] GET /me without token returns 401 Unauthorized
  [PASS] GET /me returns UNAUTHORIZED error code
  [PASS] POST /logout without token returns 401 Unauthorized

====================================================
ALL 20/20 AUTH TESTS PASSED!
====================================================
```

---

## 📊 7. Overall System Verification Matrix

| Test Suite | Purpose | Tests | Status |
| :--- | :--- | :---: | :---: |
| **`test-models.js`** | 8 Mongoose Schemas, Soft Deletes, Indexes, Relations | 46 | ✅ **PASS (46/46)** |
| **`test-foundation.js`**| Express App, Config, Morgan/Winston, ErrorHandler, Health Routes | 35 | ✅ **PASS (35/35)** |
| **`test-auth.js`** | Bcrypt, JWT, Validators, Protect, RestrictTo RBAC, Auth Routes | 20 | ✅ **PASS (20/20)** |
| **Total** | **Full PayGuard Backend Validation** | **101** | ✅ **100% PASSING** |
