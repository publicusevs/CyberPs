const { poolPromise, mssql } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const { police_station_id } = req.user;
        const pool = await poolPromise;
        const request = pool.request();
        
        let caseFilter = '';
        if (police_station_id) {
            request.input('ps_id', mssql.Int, police_station_id);
            caseFilter = ' JOIN case_station_mapping csm ON c.case_id = csm.case_id WHERE csm.police_station_id = @ps_id';
        }

        const statsQuery = (where = '') => `SELECT COUNT(*) as count FROM cases c ${caseFilter} ${where ? (caseFilter ? ' AND ' : ' WHERE ') + where : ''}`;
        
        const totalCases = await request.batch(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter}`);
        const activeCases = await request.batch(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${(caseFilter ? ' AND ' : ' WHERE ')} c.status = 'Active'`);
        const closedCases = await request.batch(`SELECT COUNT(c.case_id) as count FROM cases c ${caseFilter} ${(caseFilter ? ' AND ' : ' WHERE ')} c.status = 'Closed'`);
        const totalFraud = await request.batch(`SELECT SUM(c.fraud_amount) as total FROM cases c ${caseFilter}`);
        
        const recentActivity = await request.batch(`
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
