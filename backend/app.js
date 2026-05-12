'use strict';

// Load .env file FIRST — must happen before env.js validation reads process.env
require('dotenv').config();

// Validate all required env vars — crashes with a clear message if any are missing
require('./src/config/env');


const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Centralized Error Handler ─────────────────────────────────────────────────
// Must be LAST — catches all errors forwarded via next(err)
app.use(errorHandler);

// ── Server Bootstrap ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

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

