/**
 * rateLimiter.js — Express rate limiting configurations.
 *
 * Provides different rate limit presets for different route groups.
 * Prevents brute-force attacks on auth endpoints and general API abuse.
 *
 * Usage in routes:
 *   const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');
 *   app.use('/api/auth', authLimiter, authRoutes);
 *   app.use('/api', apiLimiter);
 */

const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for authentication endpoints (login, refresh-token).
 * Allows 10 requests per 15 minutes per IP — blocks brute force.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
    skip: () => process.env.NODE_ENV === 'development', // Skip in dev for convenience
});

/**
 * General API limiter — protects all /api routes.
 * Allows 200 requests per minute per IP.
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
    skip: () => process.env.NODE_ENV === 'development', // Skip in dev
});

/**
 * Upload limiter — for file upload endpoints.
 * Allows 20 uploads per 5 minutes per IP.
 */
const uploadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many file uploads. Please wait a moment.',
    },
    skip: () => process.env.NODE_ENV === 'development',
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };
