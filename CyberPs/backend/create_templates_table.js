require('dotenv').config({ path: './.env' });
const { mssql, poolPromise } = require('./src/config/db');

async function createTable() {
    try {
        const pool = await poolPromise;
        const query = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notice_templates' AND xtype='U')
            BEGIN
                CREATE TABLE notice_templates (
                    template_id INT PRIMARY KEY IDENTITY(1,1),
                    template_name NVARCHAR(150) NOT NULL,
                    subject_text NVARCHAR(MAX),
                    body_text NVARCHAR(MAX),
                    footer_text NVARCHAR(MAX),
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Successfully created notice_templates table.';
            END
            ELSE
            BEGIN
                PRINT 'notice_templates table already exists.';
            END
        `;
        await pool.request().query(query);
    } catch (e) {
        console.error('Error creating table:', e.message);
    } finally {
        process.exit(0);
    }
}

createTable();
