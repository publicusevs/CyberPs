/**
 * responseHelper — Standardizes all API response shapes to ensure
 * the frontend always receives a consistent { success, data, message } contract.
 *
 * This prevents ad-hoc res.json() calls with inconsistent structures.
 *
 * Usage:
 *   const { sendSuccess, sendError, sendPaginated } = require('../core/responseHelper');
 *   sendSuccess(res, data, 'Case created', 201);
 *   sendError(res, 'Not found', 404);
 */

/**
 * Send a successful response.
 * @param {object} res - Express response object
 * @param {any} data - Payload to include in response
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    const payload = { success: true, message };
    if (data !== null && data !== undefined) {
        payload.data = data;
    }
    return res.status(statusCode).json(payload);
};

/**
 * Send a created (201) response.
 * @param {object} res
 * @param {any} data
 * @param {string} message
 */
const sendCreated = (res, data = null, message = 'Created successfully') =>
    sendSuccess(res, data, message, 201);

/**
 * Send an error response.
 * @param {object} res
 * @param {string} message
 * @param {number} statusCode
 * @param {any} details - Optional extra info (only shown in dev)
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, details = null) => {
    const payload = { success: false, message };
    if (details && process.env.NODE_ENV === 'development') {
        payload.details = details;
    }
    return res.status(statusCode).json(payload);
};

/**
 * Send paginated response (for future list endpoints with pagination).
 * @param {object} res
 * @param {Array} data
 * @param {number} total - Total record count
 * @param {number} page
 * @param {number} limit
 */
const sendPaginated = (res, data, total, page = 1, limit = 20) => {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
};

module.exports = { sendSuccess, sendCreated, sendError, sendPaginated };
