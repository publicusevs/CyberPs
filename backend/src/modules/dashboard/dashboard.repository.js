/**
 * dashboard.repository.js — Database access layer for Dashboard stats.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const DashboardRepository = {

    async getStats(policeStationId) {
        const pool = await poolPromise;

        const addFilter = (req) => {
            if (policeStationId) req.input('ps_id', mssql.Int, policeStationId);
            return req;
        };

        const caseFilter = policeStationId
            ? ' JOIN case_station_mapping csm ON c.case_id = csm.case_id WHERE csm.police_station_id = @ps_id'
            : '';

        const [totalCases, activeCases, closedCases, totalFraud, recentActivity] = await Promise.all([
            addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter}`),
            addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${caseFilter ? ' AND ' : ' WHERE '} c.status = 'Active'`),
            addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${caseFilter ? ' AND ' : ' WHERE '} c.status = 'Closed'`),
            addFilter(pool.request()).query(`SELECT SUM(c.fraud_amount) as total FROM cases c ${caseFilter}`),
            addFilter(pool.request()).query(`
                SELECT TOP 5 c.fir_no, c.created_at, u.name as created_by 
                FROM cases c 
                JOIN users u ON c.created_by = u.user_id 
                ${caseFilter}
                ORDER BY c.created_at DESC
            `),
        ]);

        return {
            stats: {
                totalCases: totalCases.recordset[0].count,
                activeCases: activeCases.recordset[0].count,
                closedCases: closedCases.recordset[0].count,
                totalFraudAmount: totalFraud.recordset[0].total || 0,
            },
            recentActivity: recentActivity.recordset,
        };
    },
};

module.exports = DashboardRepository;
