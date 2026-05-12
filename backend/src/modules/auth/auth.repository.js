/**
 * auth.repository.js — Database access layer for authentication.
 *
 * All SQL for user lookup, session management, and refresh token lives here.
 * Controllers/services NEVER call poolPromise directly.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const AuthRepository = {
    /**
     * Find a user by username, email, or mobile (for login).
     * Includes police station info via JOIN.
     * @param {string} identifier
     * @returns {Promise<object|null>}
     */
    async findByIdentifier(identifier) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('identifier', mssql.NVarChar, identifier)
            .query(`
                SELECT u.*, usm.police_station_id, ps.station_name, ps.station_code 
                FROM users u
                LEFT JOIN user_station_mapping usm ON u.user_id = usm.user_id
                LEFT JOIN police_stations ps ON usm.police_station_id = ps.police_station_id
                WHERE (u.username = @identifier OR u.email = @identifier OR u.mobile = @identifier) 
                AND u.is_active = 1
            `);
        return result.recordset[0] || null;
    },

    /**
     * Find a user by ID (for refresh token flow).
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async findById(userId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', mssql.Int, userId)
            .query(`
                SELECT u.*, usm.police_station_id, ps.station_name 
                FROM users u 
                LEFT JOIN user_station_mapping usm ON u.user_id = usm.user_id 
                LEFT JOIN police_stations ps ON usm.police_station_id = ps.police_station_id 
                WHERE u.user_id = @user_id AND u.is_active = 1
            `);
        return result.recordset[0] || null;
    },

    /**
     * Save a login session record.
     * @param {object} params
     */
    async createSession({ userId, token, refreshToken, ipAddress, deviceInfo }) {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', mssql.Int, userId)
            .input('token', mssql.NVarChar, token)
            .input('refresh_token', mssql.NVarChar, refreshToken)
            .input('ip_address', mssql.NVarChar, ipAddress)
            .input('device_info', mssql.NVarChar, deviceInfo)
            .query('INSERT INTO login_sessions (user_id, token, refresh_token, ip_address, device_info) VALUES (@user_id, @token, @refresh_token, @ip_address, @device_info)');
    },
};

module.exports = AuthRepository;
