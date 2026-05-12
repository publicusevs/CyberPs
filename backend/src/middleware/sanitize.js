/**
 * sanitize.js — Input sanitization middleware.
 *
 * Strips HTML tags and null bytes from all string values in req.body.
 * Prevents XSS via stored data and null byte injection.
 *
 * Does NOT prevent SQL injection — that's handled by parameterized queries.
 * Does NOT strip legitimate rich text (that should go through a purpose-built sanitizer).
 *
 * Usage: app.use(sanitize) — after express.json()
 */

'use strict';

const UPLOAD_TYPE_WHITELIST = ['fir', 'evidence', 'excels', 'notices'];

/**
 * Strip HTML tags and null bytes from a string.
 * @param {string} value
 * @returns {string}
 */
const stripHtml = (value) => {
    if (typeof value !== 'string') return value;
    // Remove null bytes
    value = value.replace(/\0/g, '');
    // Strip HTML tags
    value = value.replace(/<[^>]*>/g, '');
    return value;
};

/**
 * Recursively sanitize all string values in an object.
 * @param {any} obj
 * @returns {any}
 */
const sanitizeDeep = (obj) => {
    if (typeof obj === 'string') return stripHtml(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeDeep);
    if (obj !== null && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            obj[key] = sanitizeDeep(obj[key]);
        }
    }
    return obj;
};

/**
 * Express middleware: sanitize req.body in-place.
 */
const sanitize = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeDeep(req.body);
    }
    next();
};

/**
 * Validate uploadType against whitelist.
 * Prevents path traversal attacks via the upload directory path construction.
 * Usage: apply before multer middleware on upload routes.
 */
const validateUploadType = (req, res, next) => {
    const uploadType = req.body.uploadType || req.query.uploadType;
    if (uploadType && !UPLOAD_TYPE_WHITELIST.includes(uploadType)) {
        return res.status(400).json({
            success: false,
            message: `Invalid upload type. Allowed: ${UPLOAD_TYPE_WHITELIST.join(', ')}`,
        });
    }
    next();
};

module.exports = { sanitize, validateUploadType };
