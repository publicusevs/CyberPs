/**
 * errorHandler.js — Centralized global error handling middleware.
 *
 * Catches ALL errors forwarded via next(err) from any route or asyncHandler.
 * Provides structured responses and prevents leaking stack traces in production.
 *
 * Must be registered LAST in app.js (after all routes):
 *   app.use(errorHandler);
 */

const AppError = require('../core/AppError');
const logger = require('../utils/logger');

/**
 * @param {Error|AppError} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
    // Determine status code: use AppError's code, or fall back to 500
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    const isOperational = err instanceof AppError && err.isOperational;

    // Always log the error
    if (statusCode >= 500) {
        logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, err);
    } else {
        logger.warn(`[${req.method}] ${req.originalUrl} — ${err.message}`);
    }

    // Handle specific MSSQL errors
    if (err.code === 'EREQUEST' || err.number) {
        return res.status(400).json({
            success: false,
            message: 'Database query error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ success: false, message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ success: false, message: 'Token expired.' });
    }

    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large. Maximum 10MB allowed.' });
    }

    // Operational errors: safe to expose message to client
    if (isOperational) {
        return res.status(statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Non-operational (unexpected) errors: hide details in production
    return res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;
