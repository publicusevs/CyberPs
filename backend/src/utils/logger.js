/**
 * logger — Structured application logger.
 *
 * Wraps console.* with consistent formatting:
 *  - Timestamp on every message
 *  - Log levels: info, warn, error, debug
 *  - In production: debug suppressed, errors written to stderr
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started on port 5000');
 *   logger.error('DB connection failed', err);
 */

const isDev = process.env.NODE_ENV !== 'production';

const timestamp = () => new Date().toISOString();

const formatMessage = (level, message, extra) => {
    const base = `[${timestamp()}] [${level}] ${message}`;
    if (extra && extra instanceof Error) {
        return `${base}\n  ${extra.stack || extra.message}`;
    }
    if (extra !== undefined) {
        return `${base} ${typeof extra === 'object' ? JSON.stringify(extra) : extra}`;
    }
    return base;
};

const logger = {
    info: (message, extra) => {
        console.log(formatMessage('INFO ', message, extra));
    },

    warn: (message, extra) => {
        console.warn(formatMessage('WARN ', message, extra));
    },

    error: (message, extra) => {
        console.error(formatMessage('ERROR', message, extra));
    },

    debug: (message, extra) => {
        if (isDev) {
            console.log(formatMessage('DEBUG', message, extra));
        }
    },

    /**
     * Log an incoming HTTP request (used in requestLogger middleware).
     * @param {string} method
     * @param {string} url
     * @param {number} statusCode
     * @param {number} ms - response time in ms
     * @param {string} traceId
     */
    request: (method, url, statusCode, ms, traceId) => {
        const statusColor = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN ' : 'INFO ';
        console.log(
            `[${timestamp()}] [${statusColor}] [${traceId || '-'}] ${method} ${url} ${statusCode} ${ms}ms`
        );
    }
};

module.exports = logger;
