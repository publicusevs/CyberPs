const { poolPromise, mssql } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const { police_station_id } = req.user;
        const pool = await poolPromise;
        
        let caseFilter = '';
        const addFilter = (req) => {
            if (police_station_id) {
                req.input('ps_id', mssql.Int, police_station_id);
            }
            return req;
        };

        if (police_station_id) {
            caseFilter = ' JOIN case_station_mapping csm ON c.case_id = csm.case_id WHERE csm.police_station_id = @ps_id';
        }

        const totalCases = await addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter}`);
        const activeCases = await addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${(caseFilter ? ' AND ' : ' WHERE ')} c.status = 'Active'`);
        const closedCases = await addFilter(pool.request()).query(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${(caseFilter ? ' AND ' : ' WHERE ')} c.status = 'Closed'`);
        const totalFraud = await addFilter(pool.request()).query(`SELECT SUM(c.fraud_amount) as total FROM cases c ${caseFilter}`);
        
        const recentActivity = await addFilter(pool.request()).query(`
            SELECT TOP 5 c.fir_no, c.created_at, u.name as created_by 
            FROM cases c 
            JOIN users u ON c.created_by = u.user_id 
            ${caseFilter}
            ORDER BY c.created_at DESC
        `);

        res.json({
            success: true,
            stats: {
                totalCases: totalCases.recordset[0].count,
                activeCases: activeCases.recordset[0].count,
                closedCases: closedCases.recordset[0].count,
                totalFraudAmount: totalFraud.recordset[0].total || 0
            },
            recentActivity: recentActivity.recordset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
};
