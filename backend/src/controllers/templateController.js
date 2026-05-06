const { poolPromise } = require('../config/db');

const ensureTableExists = async (pool) => {
    // Check if table exists
    const tableCheck = await pool.request().query("SELECT * FROM sysobjects WHERE name='notice_templates' AND xtype='U'");
    
    if (tableCheck.recordset.length === 0) {
        const createQuery = `
            CREATE TABLE notice_templates (
                template_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                template_name NVARCHAR(150) NOT NULL UNIQUE,
                template_type NVARCHAR(50) DEFAULT 'Standard',
                subject_text NVARCHAR(MAX),
                body_text NVARCHAR(MAX),
                footer_text NVARCHAR(MAX),
                json_data NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            );
        `;
        await pool.request().query(createQuery);
    } else {
        // Table exists, check if template_id is uniqueidentifier
        const colCheck = await pool.request().query("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notice_templates' AND COLUMN_NAME = 'template_id'");
        if (colCheck.recordset[0]?.DATA_TYPE === 'int') {
            // Migration needed: dropping and recreating for fresh dev environment
            await pool.request().query("DROP TABLE notice_templates");
            await ensureTableExists(pool); // Recurse to create
        } else {
            // Check for json_data column
            const jsonColCheck = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notice_templates' AND COLUMN_NAME = 'json_data'");
            if (jsonColCheck.recordset.length === 0) {
                await pool.request().query("ALTER TABLE notice_templates ADD json_data NVARCHAR(MAX)");
            }
        }
    }
};

exports.getAllTemplates = async (req, res) => {
    try {
        const pool = await poolPromise;
        await ensureTableExists(pool);
        const result = await pool.request().query('SELECT * FROM notice_templates ORDER BY created_at DESC');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await ensureTableExists(pool);
        const result = await pool.request()
            .input('id', id)
            .query('SELECT * FROM notice_templates WHERE template_id = @id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { template_name, template_type, subject_text, body_text, footer_text, json_data } = req.body;
        const pool = await poolPromise;
        await ensureTableExists(pool);
        
        // Ensure json_data has the required structure if not provided
        const finalJsonData = json_data || {
            fields: [],
            table_columns: [],
            mapping: {}
        };

        await pool.request()
            .input('name', template_name)
            .input('type', template_type || 'Standard')
            .input('subject', subject_text || '')
            .input('body', body_text || '')
            .input('footer', footer_text || '')
            .input('json', JSON.stringify(finalJsonData))
            .query(`
                INSERT INTO notice_templates (template_id, template_name, template_type, subject_text, body_text, footer_text, json_data)
                VALUES (NEWID(), @name, @type, @subject, @body, @footer, @json)
            `);
        res.json({ success: true, message: 'Template created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { template_name, template_type, subject_text, body_text, footer_text, json_data } = req.body;
        const pool = await poolPromise;
        await ensureTableExists(pool);

        await pool.request()
            .input('id', id)
            .input('name', template_name)
            .input('type', template_type || 'Standard')
            .input('subject', subject_text || '')
            .input('body', body_text || '')
            .input('footer', footer_text || '')
            .input('json', json_data ? JSON.stringify(json_data) : null)
            .query(`
                UPDATE notice_templates 
                SET template_name = @name, 
                    template_type = @type,
                    subject_text = @subject, 
                    body_text = @body, 
                    footer_text = @footer,
                    json_data = @json,
                    updated_at = GETDATE()
                WHERE template_id = @id
            `);
        res.json({ success: true, message: 'Template updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await ensureTableExists(pool);
        await pool.request()
            .input('id', id)
            .query('DELETE FROM notice_templates WHERE template_id = @id');
        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
