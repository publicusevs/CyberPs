const { poolPromise, mssql } = require('../config/db');

exports.getInvestigators = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT user_id, name, role FROM users WHERE is_active = 1 AND (role = 'IO' OR role = 'Admin') ORDER BY name ASC");
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch investigators' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const pool = await poolPromise;
        const totalCases = await pool.request().query("SELECT COUNT(*) as count FROM cases");
        const activeCases = await pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status != 'Closed'");
        const totalFraud = await pool.request().query("SELECT SUM(fraud_amount) as total FROM cases");
        
        res.json({
            success: true,
            totalCases: totalCases.recordset[0].count,
            activeCases: activeCases.recordset[0].count,
            totalFraud: totalFraud.recordset[0].total || 0
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Stats retrieval failed' });
    }
};
