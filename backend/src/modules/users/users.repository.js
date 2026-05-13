/**
 * users.repository.js — Database access layer for Users.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const UsersRepository = {

    async getInvestigators() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT user_id, name, role FROM users WHERE is_active = 1 AND (role IN ('IO', 'Admin', 'Investigating Officer', '1', '2', '3')) ORDER BY name ASC");
        return result.recordset;
    },

    async getStats() {
        const pool = await poolPromise;
        const [totalCases, activeCases, totalFraud] = await Promise.all([
            pool.request().query('SELECT COUNT(*) as count FROM cases'),
            pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status != 'Closed'"),
            pool.request().query('SELECT SUM(fraud_amount) as total FROM cases'),
        ]);
        return {
            totalCases: totalCases.recordset[0].count,
            activeCases: activeCases.recordset[0].count,
            totalFraud: totalFraud.recordset[0].total || 0,
        };
    },
};

module.exports = UsersRepository;
