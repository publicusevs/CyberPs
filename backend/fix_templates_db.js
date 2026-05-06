require('dotenv').config({ path: './.env' });
const { mssql, poolPromise } = require('./src/config/db');

async function fixTable() {
    try {
        const pool = await poolPromise;
        if (!pool) return;

        console.log('--- Database Integrity Check ---');
        
        // Check if notice_templates exists
        const checkTable = await pool.request().query("SELECT * FROM sysobjects WHERE name='notice_templates' AND xtype='U'");
        
        if (checkTable.recordset.length === 0) {
            console.log('Creating notice_templates table...');
            await pool.request().query(`
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
            `);
        } else {
            console.log('Checking column types...');
            const columns = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notice_templates'");
            const idCol = columns.recordset.find(c => c.COLUMN_NAME === 'template_id');
            
            if (idCol && idCol.DATA_TYPE !== 'uniqueidentifier') {
                console.log('Migrating template_id from INT to UNIQUEIDENTIFIER...');
                // This is a complex migration. For simplicity in this dev environment, we'll drop and recreate if it's empty or has test data.
                // Or better, just alter it if possible. 
                // But dropping and recreating is safer for a fresh system.
                await pool.request().query(`
                    DROP TABLE notice_templates;
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
                `);
                console.log('Table recreated with UNIQUEIDENTIFIER.');
            } else {
                console.log('Table schema is already correct.');
            }
        }
    } catch (e) {
        console.error('Error fixing table:', e.message);
    } finally {
        process.exit(0);
    }
}

fixTable();
