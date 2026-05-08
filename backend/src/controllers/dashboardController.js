const { poolPromise, mssql } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        const totalCases = await pool.request().query('SELECT COUNT(*) as count FROM cases');
        const activeCases = await pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status = 'Active'");
        const closedCases = await pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status = 'Closed'");
        const totalFraud = await pool.request().query('SELECT SUM(fraud_amount) as total FROM cases');
        
        const recentActivity = await pool.request().query('SELECT TOP 5 c.fir_no, c.created_at, u.name as created_by FROM cases c JOIN users u ON c.created_by = u.user_id ORDER BY c.created_at DESC');

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
