/**
 * env.js — Centralized environment variable validation.
 *
 * Validates all required env vars at startup. Provides defaults for optional
 * ones. Crashes with a clear message if critical vars are missing.
 *
 * Usage: require('./config/env') — called once at the top of app.js
 * All other files should use process.env.* normally.
 */

const logger = require('../utils/logger');

const REQUIRED = [
    'DB_USER',
    'DB_PASSWORD',
    'DB_SERVER',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
];

const DEFAULTS = {
    PORT: '5000',
    DB_PORT: '1433',
    NODE_ENV: 'development',
    JWT_EXPIRE: '1h',
    JWT_REFRESH_EXPIRE: '7d',
    SMTP_HOST: 'smtp.rajasthan.gov.in',
    SMTP_PORT: '465',
    CORS_ORIGIN: 'http://localhost:5173',
};

// Apply defaults for missing optional vars
Object.entries(DEFAULTS).forEach(([key, val]) => {
    if (!process.env[key]) {
        process.env[key] = val;
    }
});

// Validate required vars
const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
    logger.error(
        `[ENV] Missing required environment variables: ${missing.join(', ')}\n` +
        `      Copy .env.example to .env and fill in the values.`
    );
    process.exit(1);
}

// Warn about insecure defaults in production
if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        logger.warn('[ENV] JWT_SECRET is too short for production use (< 32 chars).');
    }
    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
        logger.warn('[ENV] JWT_REFRESH_SECRET is too short for production use (< 32 chars).');
    }
}

logger.info(`[ENV] Environment: ${process.env.NODE_ENV} | Port: ${process.env.PORT}`);

module.exports = {};
