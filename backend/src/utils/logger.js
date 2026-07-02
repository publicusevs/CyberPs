/**
 * logger - Structured application logger.
 *
 * Wraps console.* with consistent formatting and writes to physical log files.
 *  - Timestamp on every message
 *  - Log levels: info, warn, error, debug
 *  - Writes to logs/activity.log and logs/error.log
 */

const fs = require('fs');
const path = require('path');
const { isPkg, backendRoot } = require('./appPaths');

const isDev = process.env.NODE_ENV !== 'production';

// Determine logs directory securely
const logsDir = isPkg 
    ? path.join(path.dirname(process.execPath), '..', 'logs') 
    : path.join(backendRoot, '..', 'logs');

if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create logs directory:', err);
    }
}

const activityLogPath = path.join(logsDir, 'activity.log');
const errorLogPath = path.join(logsDir, 'error.log');

const writeLogFile = (filePath, msg) => {
    if (!fs.existsSync(logsDir)) return;
    fs.appendFile(filePath, msg + '\n', (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
};

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
        const msg = formatMessage('INFO ', message, extra);
        console.log(msg);
        writeLogFile(activityLogPath, msg);
    },

    warn: (message, extra) => {
        const msg = formatMessage('WARN ', message, extra);
        console.warn(msg);
        writeLogFile(activityLogPath, msg);
    },

    error: (message, extra) => {
        const msg = formatMessage('ERROR', message, extra);
        console.error(msg);
        writeLogFile(activityLogPath, msg);
        writeLogFile(errorLogPath, msg);
    },

    debug: (message, extra) => {
        if (isDev) {
            const msg = formatMessage('DEBUG', message, extra);
            console.log(msg);
            writeLogFile(activityLogPath, msg);
        }
    },

    /**
     * Log an incoming HTTP request (used in requestLogger middleware).
     */
    request: (method, url, statusCode, ms, traceId) => {
        const statusColor = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN ' : 'INFO ';
        const msg = `[${timestamp()}] [${statusColor}] [${traceId || '-'}] ${method} ${url} ${statusCode} ${ms}ms`;
        console.log(msg);
        writeLogFile(activityLogPath, msg);
    }
};

module.exports = logger;
