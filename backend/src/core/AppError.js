/**
 * AppError — Custom typed error class for the application.
 * Allows differentiation between operational errors (expected, safe to expose)
 * and programming errors (unexpected, should not be exposed in production).
 *
 * Usage:
 *   throw new AppError('Case not found', 404);
 *   throw new AppError('Unauthorized', 403);
 */
class AppError extends Error {
    /**
     * @param {string} message  - Human-readable error message
     * @param {number} statusCode - HTTP status code (4xx for client, 5xx for server)
     * @param {boolean} isOperational - true = expected error safe to send to client
     */
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        // Capture clean stack trace (excludes constructor frame)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
