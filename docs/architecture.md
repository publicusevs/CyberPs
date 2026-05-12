# CyberPs — Architecture Documentation

## System Overview

**Investigation Hunter** is a Rajasthan Police Cyber Crime forensic case management system.

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + Framer Motion |
| Backend | Node.js 18 + Express 5 (CommonJS) |
| Database | MSSQL Server (via `mssql` node package) |
| Auth | JWT (access + refresh token pattern) |
| Email | Nodemailer (Rajasthan Gov SMTP relay) |

---

## Backend Module Map

```
backend/
├── app.js                          ← Entry: middleware + route loader + server bootstrap
│
└── src/
    ├── config/
    │   ├── db.js                   ← MSSQL connection pool (singleton)
    │   ├── env.js                  ← Env validation (crashes early if vars missing)
    │   ├── mail.js                 ← Nodemailer transporter factory (singleton)
    │   └── cors.js                 ← CORS allowed origins
    │
    ├── core/
    │   ├── AppError.js             ← Typed error class (statusCode + isOperational)
    │   ├── asyncHandler.js         ← try/catch wrapper for async controllers
    │   └── responseHelper.js       ← Standardized response shapes
    │
    ├── middleware/
    │   ├── auth.js                 ← JWT authenticate + authorize(roles)
    │   ├── fileUpload.js           ← Multer config (10MB, pdf/img/xlsx only)
    │   ├── errorHandler.js         ← Global error middleware (last in chain)
    │   ├── rateLimiter.js          ← authLimiter / apiLimiter / uploadLimiter
    │   └── sanitize.js             ← HTML strip + null byte removal + uploadType whitelist
    │
    ├── modules/                    ← Domain-driven feature modules
    │   ├── auth/                   ← Authentication
    │   │   ├── auth.routes.js      → POST /api/auth/login, POST /refresh-token
    │   │   ├── auth.controller.js  → Thin HTTP handlers
    │   │   ├── auth.service.js     → Login logic, token generation, refresh
    │   │   └── auth.repository.js  → SQL: users lookup, session save
    │   │
    │   ├── cases/                  ← Case Management (core domain)
    │   │   ├── cases.routes.js     → CRUD + notes + evidence + status + file ops
    │   │   ├── cases.controller.js → 11 thin handlers
    │   │   ├── cases.service.js    → Transactional orchestration (createCase, updateFullCase...)
    │   │   └── cases.repository.js → SQL for: cases, victims, accused, evidence, FIR, notes, history
    │   │
    │   ├── transactions/           ← Forensic Transaction Import
    │   │   ├── transactions.routes.js   → POST /import, GET /search, GET /case/:id/flow
    │   │   ├── transactions.controller.js
    │   │   ├── transactions.service.js  → Excel parsing (smart column detection), bulk insert
    │   │   └── transactions.repository.js → SQL: insertOne, bulkInsert, deleteByCase, search
    │   │
    │   ├── trail/                  ← Money Trail Analyzer (forensic graph)
    │   │   ├── trail.routes.js     → GET /case/:id, POST /analyze-excel, POST /reanalyze
    │   │   ├── trail.controller.js → Preserves exact response shapes for frontend
    │   │   └── trail.service.js    → Wraps moneyTrailService + parseExcelForTrail
    │   │
    │   ├── notices/                ← Legal Notice Management
    │   │   ├── notices.routes.js   → POST /, GET /case/:id, GET /:id, PUT /:id
    │   │   ├── notices.controller.js
    │   │   ├── notices.service.js  → saveNotice (→ legal_notices table)
    │   │   └── notices.repository.js
    │   │
    │   ├── templates/              ← Notice Template Config
    │   │   ├── templates.routes.js → Full CRUD
    │   │   ├── templates.controller.js
    │   │   ├── templates.service.js
    │   │   └── templates.repository.js → DDL removed from hot path
    │   │
    │   ├── variables/              ← Global Protocol Registry
    │   │   ├── variables.routes.js → GET, POST (upsert), PUT /:id, DELETE /:id
    │   │   ├── variables.controller.js
    │   │   ├── variables.service.js
    │   │   └── variables.repository.js → ensureDefaults() exported for migrate.js
    │   │
    │   ├── police-stations/        ← Unit Registry
    │   │   ├── police-stations.routes.js
    │   │   ├── police-stations.controller.js
    │   │   ├── police-stations.service.js → syncStation (create/update + user mapping)
    │   │   └── police-stations.repository.js
    │   │
    │   ├── dashboard/              ← Aggregated Stats
    │   │   ├── dashboard.routes.js → GET /stats
    │   │   ├── dashboard.controller.js
    │   │   ├── dashboard.service.js
    │   │   └── dashboard.repository.js → 5 parallel queries
    │   │
    │   ├── email/                  ← SMTP Email Dispatch
    │   │   ├── email.routes.js     → POST /test-send
    │   │   ├── email.controller.js
    │   │   └── email.service.js    → Uses config/mail.js singleton transporter
    │   │
    │   └── users/                  ← User Management
    │       ├── users.routes.js     → GET /investigators, GET /stats
    │       ├── users.controller.js
    │       ├── users.service.js
    │       └── users.repository.js
    │
    ├── services/                   ← Cross-cutting forensic services (unchanged)
    │   ├── moneyTrailService.js    ← Graph builder: buildGraph(), parseExcelForTrail()
    │   └── FundFlowService.js      ← Fund flow extractor from evidence files
    │
    ├── utils/
    │   └── logger.js               ← Structured logger (INFO/WARN/ERROR/DEBUG)
    │
    └── scripts/
        └── migrate.js              ← Safe one-time DDL migration (npm run migrate)
```

---

## Frontend Module Map

```
frontend/src/
├── App.jsx                         ← Routing only (~60 lines)
│
├── layouts/
│   ├── AppLayout.jsx               ← Shell: sidebar + navbar + content area
│   ├── Navbar.jsx                  ← Top navigation bar
│   └── SidebarLink.jsx             ← Navigation link primitive
│
├── context/
│   └── AuthContext.jsx             ← JWT token management + login/logout
│
├── services/
│   └── api.js                      ← Axios instance (VITE_API_URL env var)
│
├── routes/
│   └── ProtectedRoute.jsx          ← Auth guard
│
├── components/
│   └── ProfileModal.jsx
│
└── pages/                          ← Feature pages (to be split in future phases)
    ├── Dashboard.jsx
    ├── CaseList.jsx
    ├── CaseForm.jsx
    ├── CaseDetails.jsx             (48KB — split candidate: Priority 1)
    ├── LetterPreview.jsx           (50KB — split candidate: Priority 2)
    ├── TemplatesConfig.jsx         (54KB — split candidate: Priority 3)
    ├── MoneyTrailAnalyzer.jsx
    ├── NoticeConfigForm.jsx
    └── ...
```

---

## Key Design Decisions

### 1. Canonical addTransaction
The `transactionController.addTransaction` is the canonical implementation:
- Uses: `case_id`, `sender_acc`, `receiver_acc`, `amount`, `utr_no`, `trans_date`, `platform`
- The `platform` field matches the DB schema — the old `caseController.addTransaction` (without `platform`) is deprecated.

### 2. saveNotice disambiguation
Two different functions had the same name in the old code:
- `caseController.saveNotice` → `cases.service.savePdfNotice` — saves PDF artifact to `fir_documents`
- `noticeController.saveNotice` → `notices.service.saveNotice` — saves structured record to `legal_notices`

### 3. DDL Hot Path Removal
`ensureTableExists()` previously ran DDL (`CREATE TABLE IF NOT EXISTS`) on every API request.
This was moved to `npm run migrate` — a one-time startup script. Run it once on new deployments.

### 4. Environment Variables
All required vars are validated at startup by `src/config/env.js`.
Copy `.env.example` → `.env` and fill in values. Never commit `.env`.

---

## API Route Map

All existing API paths are PRESERVED. Zero breaking changes.

| Path | Module | Auth Required |
|---|---|---|
| POST `/api/auth/login` | auth | ❌ |
| POST `/api/auth/refresh-token` | auth | ❌ |
| GET `/api/cases` | cases | ✅ |
| POST `/api/cases` | cases | ✅ |
| GET `/api/cases/:id` | cases | ✅ |
| POST `/api/transactions/import` | transactions | ✅ |
| GET `/api/trail/case/:id` | trail | ✅ |
| POST `/api/trail/analyze-excel` | trail | ✅ |
| POST `/api/notices` | notices | ✅ |
| GET `/api/templates` | templates | ✅ |
| GET `/api/variables` | variables | ✅ |
| GET `/api/dashboard/stats` | dashboard | ✅ |
| POST `/api/police-stations` | police-stations | ✅ |
| POST `/api/email/test-send` | email | ❌ |
| GET `/health` | system | ❌ |

---

## Security Controls

| Control | Implementation |
|---|---|
| SQL Injection | MSSQL parameterized queries (`.input()` on every value) |
| XSS | `sanitize.js` middleware strips HTML from all req.body strings |
| Null byte injection | Removed by sanitize.js |
| Auth | JWT with short-lived access token (1h) + refresh token (7d) |
| Brute Force | `authLimiter`: 10 req / 15min on login endpoint |
| General abuse | `apiLimiter`: 200 req / min on all API routes |
| CORS | Restricted to `CORS_ORIGIN` env var (no wildcard in production) |
| Upload path traversal | `uploadType` validated against whitelist in `sanitize.js` |
| File size | Multer: 10MB max |
| File type | Extension + MIME type whitelist (pdf, jpg, png, xlsx, csv) |

---

## Running the System

```powershell
# Backend (first time — run migration)
cd backend
npm run migrate

# Start backend
npm run dev

# Frontend
cd frontend
npm run dev
```

Environment: set `VITE_API_URL` in `frontend/.env` and all vars in `backend/.env`.
