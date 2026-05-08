const { poolPromise, mssql } = require('../config/db');

exports.saveNotice = async (req, res) => {
    try {
        const { 
            case_id, platform_name, legal_sections, issued_by, 
            receiver_name, receiver_address, receiver_email,
            target_account_details, requested_data_points, notice_content,
            status 
        } = req.body;
        const { police_station_id } = req.user;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, case_id)
            .input('ps_id', mssql.Int, police_station_id)
            .input('platform', mssql.NVarChar, platform_name)
            .input('sections', mssql.NVarChar, JSON.stringify(legal_sections))
            .input('issued_by', mssql.NVarChar, issued_by)
            .input('recv_name', mssql.NVarChar, receiver_name)
            .input('recv_addr', mssql.NVarChar, receiver_address)
            .input('recv_email', mssql.NVarChar, receiver_email)
            .input('target_acc', mssql.NVarChar, JSON.stringify(target_account_details))
            .input('req_data', mssql.NVarChar, JSON.stringify(requested_data_points))
            .input('content', mssql.NVarChar, notice_content)
            .input('status', mssql.NVarChar, status || 'Draft')
            .query(`INSERT INTO legal_notices 
                (case_id, police_station_id, platform_name, legal_sections, issued_by, receiver_name, receiver_address, receiver_email, target_account_details, requested_data_points, notice_content, status)
                VALUES 
                (@case_id, @ps_id, @platform, @sections, @issued_by, @recv_name, @recv_addr, @recv_email, @target_acc, @req_data, @content, @status)`);

        res.json({ success: true, message: 'Notice saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error saving notice', error: err.message });
    }
};

exports.getNoticesByCase = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, id)
            .query('SELECT * FROM legal_notices WHERE case_id = @case_id ORDER BY created_at DESC');

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching notices' });
    }
};

exports.getNoticeDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('notice_id', mssql.Int, id)
            .query('SELECT * FROM legal_notices WHERE notice_id = @notice_id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Notice not found' });
        }

        const notice = result.recordset[0];
        // Parse JSON fields
        notice.legal_sections = JSON.parse(notice.legal_sections || '[]');
        notice.target_account_details = JSON.parse(notice.target_account_details || '{}');
        notice.requested_data_points = JSON.parse(notice.requested_data_points || '[]');

        res.json({ success: true, data: notice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching notice detail' });
    }
};

exports.updateNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { notice_content, status } = req.body;
        
        const pool = await poolPromise;
        await pool.request()
            .input('notice_id', mssql.Int, id)
            .input('content', mssql.NVarChar, notice_content)
            .input('status', mssql.NVarChar, status)
            .query('UPDATE legal_notices SET notice_content = @content, status = @status, updated_at = GETDATE() WHERE notice_id = @notice_id');

        res.json({ success: true, message: 'Notice updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error updating notice' });
    }
};
