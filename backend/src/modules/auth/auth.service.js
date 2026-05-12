/**
 * auth.service.js — Business logic for authentication.
 *
 * Handles: credential verification, token generation, token refresh.
 * No Express objects (req/res). Calls auth.repository for all DB ops.
 */

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthRepository = require('./auth.repository');
const AppError = require('../../core/AppError');
const logger = require('../../utils/logger');

const AuthService = {

    /**
     * Authenticate user credentials and return tokens + user data.
     * @param {string} identifier - username, email, or mobile
     * @param {string} password
     * @param {string} ipAddress
     * @param {string} deviceInfo
     * @returns {Promise<{token, refreshToken, user}>}
     */
    async login(identifier, password, ipAddress, deviceInfo) {
        const user = await AuthRepository.findByIdentifier(identifier);
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const tokenPayload = {
            user_id: user.user_id,
            role: user.role,
            police_station_id: user.police_station_id,
            station_name: user.station_name,
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE,
        });

        const refreshToken = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE }
        );

        // Save session asynchronously — don't block login response on this
        AuthRepository.createSession({
            userId: user.user_id,
            token,
            refreshToken,
            ipAddress,
            deviceInfo,
        }).catch((err) => logger.warn('[AUTH] Session save failed:', err.message));

        const { password_hash, ...userData } = user;
        return { token, refreshToken, user: userData };
    },

    /**
     * Generate a new access token from a valid refresh token.
     * @param {string} refreshToken
     * @returns {Promise<{token: string}>}
     */
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw new AppError('Refresh token required', 401);
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            throw new AppError('Invalid refresh token', 403);
        }

        const user = await AuthRepository.findById(decoded.user_id);
        if (!user) {
            throw new AppError('User not found or inactive', 401);
        }

        const newToken = jwt.sign(
            {
                user_id: user.user_id,
                role: user.role,
                police_station_id: user.police_station_id,
                station_name: user.station_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        return { token: newToken };
    },

    /**
     * Check database connectivity (used by /api/auth/status).
     */
    async getStatus() {
        const { poolPromise } = require('../../config/db');
        try {
            const pool = await poolPromise;
            return { database: !!pool, error: pool ? null : 'Database connection returned null', internet: true };
        } catch (err) {
            return { database: false, error: err.message, internet: true };
        }
    },
};

module.exports = AuthService;
