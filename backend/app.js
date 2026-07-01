'use strict';

// Polyfill AbortSignal.any for older Node.js versions (Node 18 targets packaged by pkg)
if (typeof AbortSignal !== 'undefined' && !AbortSignal.any) {
    AbortSignal.any = function (signals) {
        const controller = new AbortController();
        for (const signal of signals) {
            if (!signal) continue;
            if (signal.aborted) {
                controller.abort(signal.reason);
                return controller.signal;
            }
            signal.addEventListener('abort', () => {
                controller.abort(signal.reason);
            }, { once: true });
        }
        return controller.signal;
    };
}

const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';

// Load local .env first
require('dotenv').config();

// Load centralized root .env
const envPath = isPkg
    ? path.join(path.dirname(process.execPath), '..', '.env')
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

if (process.env.BACKEND_PORT) {
    process.env.PORT = process.env.BACKEND_PORT;
}

// Intercept 'migrate' command for packaged executable
if (process.argv.includes('migrate')) {
    require('./src/scripts/migrate');
    return;
}


// Validate all required env vars — crashes with a clear message if any are missing
require('./src/config/env');


const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { authLimiter, apiLimiter } = require('./src/middleware/rateLimiter');
const { sanitize } = require('./src/middleware/sanitize');

// ── Route Modules ─────────────────────────────────────────────────────────────
// Loaded from new modular structure — all paths identical to original.
// Old src/routes/ files kept for reference during transition.
const authRoutes = require('./src/modules/auth/auth.routes');
const caseRoutes = require('./src/modules/cases/cases.routes');
const userRoutes = require('./src/modules/users/users.routes');
const dashboardRoutes = require('./src/modules/dashboard/dashboard.routes');
const transactionRoutes = require('./src/modules/transactions/transactions.routes');
const policeStationRoutes = require('./src/modules/police-stations/police-stations.routes');
const noticeRoutes = require('./src/modules/notices/notices.routes');
const templateRoutes = require('./src/modules/templates/templates.routes');
const variableRoutes = require('./src/modules/variables/variables.routes');
const trailRoutes = require('./src/modules/trail/trail.routes');
const emailRoutes = require('./src/modules/email/email.routes');
const settingsRoutes = require('./src/modules/settings/settings.routes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Development: allow all localhost origins (Vite picks any free port).
// Production: restrict to explicit whitelist from CORS_ORIGIN env var.
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
    // In development — wide open for any localhost port
    app.use(cors({ origin: true, credentials: true }));
} else {
    // In production — explicit origin whitelist
    const allowedOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                // Reject silently (return false, don't throw) so response still has CORS headers
                callback(null, false);
            }
        },
        credentials: true,
    }));
}

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));
app.use(sanitize); // Strip HTML tags and null bytes from all request bodies

// Serve uploaded files statically
const uploadsDir = isPkg
    ? path.join(path.dirname(process.execPath), '..', 'uploads')
    : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);  // Strict: prevents brute force on login
app.use('/api', apiLimiter);        // General: prevents API abuse

// ── API Routes ────────────────────────────────────────────────────────────────
// All paths are IDENTICAL to before — backward compatible.
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/police-stations', policeStationRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/variables', variableRoutes);
app.use('/api/trail', trailRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/settings', settingsRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── Master Data Seeder (dev-only) ─────────────────────────────────────────────
app.get('/api/seed-masters', async (req, res) => {
    try {
        const { poolPromise, mssql } = require('./src/config/db');
        const pool = await poolPromise;
        const report = {};

        // ── Seed master_case_status ──────────────────────────────────────────
        const sCols = (await pool.request().query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='master_case_status' ORDER BY ORDINAL_POSITION"
        )).recordset.map(r => r.COLUMN_NAME.toLowerCase());

        const sPk   = sCols.find(c => c.includes('status_id') || c === 'id') || sCols[0];
        const sName = sCols.find(c => c.includes('name') || c.includes('status') && c !== sPk) || null;

        const statuses = [
            { id: 1, name: 'Active' },
            { id: 2, name: 'Pending' },
            { id: 3, name: 'Under Investigation' },
            { id: 4, name: 'Closed' },
            { id: 5, name: 'Chargesheeted' },
            { id: 6, name: 'Court Trial' },
        ];
        const statusInserted = [];
        if (sName) {
            for (const s of statuses) {
                const exists = (await pool.request().input('id', mssql.Int, s.id)
                    .query(`SELECT 1 FROM master_case_status WHERE ${sPk}=@id`)).recordset.length > 0;
                if (!exists) {
                    let iCols = [sPk, sName];
                    let iVals = ['@id', '@name'];
                    if (sCols.includes('is_active'))  { iCols.push('is_active');  iVals.push('1'); }
                    if (sCols.includes('created_at')) { iCols.push('created_at'); iVals.push('GETDATE()'); }
                    await pool.request().input('id', mssql.Int, s.id).input('name', mssql.NVarChar, s.name)
                        .query(`SET IDENTITY_INSERT master_case_status ON;
                                INSERT INTO master_case_status (${iCols.join(',')}) VALUES (${iVals.join(',')});
                                SET IDENTITY_INSERT master_case_status OFF;`);
                    statusInserted.push(s.name);
                }
            }
        }
        report.status = { cols: sCols, inserted: statusInserted };

        // ── Seed master_case_priority ────────────────────────────────────────
        const priExists = (await pool.request().query(
            "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='master_case_priority'"
        )).recordset.length > 0;

        const priorityInserted = [];
        if (priExists) {
            const pCols = (await pool.request().query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='master_case_priority' ORDER BY ORDINAL_POSITION"
            )).recordset.map(r => r.COLUMN_NAME.toLowerCase());

            const pPk   = pCols.find(c => c.includes('priority_id') || c === 'id') || pCols[0];
            const pName = pCols.find(c => c.includes('name') || (c.includes('priority') && c !== pPk)) || null;

            const priorities = [
                { id: 1, name: 'Low' },
                { id: 2, name: 'Medium' },
                { id: 3, name: 'High' },
                { id: 4, name: 'Critical' },
            ];

            if (pName) {
                for (const p of priorities) {
                    const exists = (await pool.request().input('id', mssql.Int, p.id)
                        .query(`SELECT 1 FROM master_case_priority WHERE ${pPk}=@id`)).recordset.length > 0;
                    if (!exists) {
                        let iCols = [pPk, pName];
                        let iVals = ['@id', '@name'];
                        if (pCols.includes('is_active'))  { iCols.push('is_active');  iVals.push('1'); }
                        if (pCols.includes('created_at')) { iCols.push('created_at'); iVals.push('GETDATE()'); }
                        await pool.request().input('id', mssql.Int, p.id).input('name', mssql.NVarChar, p.name)
                            .query(`SET IDENTITY_INSERT master_case_priority ON;
                                    INSERT INTO master_case_priority (${iCols.join(',')}) VALUES (${iVals.join(',')});
                                    SET IDENTITY_INSERT master_case_priority OFF;`);
                        priorityInserted.push(p.name);
                    }
                }
            }
            report.priority = { cols: pCols, inserted: priorityInserted };
        } else {
            report.priority = { error: 'Table master_case_priority not found' };
        }

        // ── Final rows ───────────────────────────────────────────────────────
        const statusRows    = (await pool.request().query(`SELECT * FROM master_case_status ORDER BY ${sPk}`)).recordset;
        const priorityRows  = priExists
            ? (await pool.request().query('SELECT * FROM master_case_priority ORDER BY 1')).recordset
            : [];

        res.json({ success: true, report, statusRows, priorityRows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Serve static frontend files in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    const frontendDist = isPkg
        ? path.join(path.dirname(process.execPath), '..', 'frontend', 'dist')
        : path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));
    
    // Wildcard route for SPA routing (React Router)
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Centralized Error Handler ─────────────────────────────────────────────────
// Must be LAST — catches all errors forwarded via next(err)
app.use(errorHandler);

// ── Server Bootstrap ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5174;

const serverInstance = app.listen(PORT, () => {
    logger.info(`✔ Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

// ── Process-level Error Handlers ──────────────────────────────────────────────
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception — shutting down.', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received — closing server gracefully.');
    serverInstance.close(() => process.exit(0));
});

module.exports = app;

