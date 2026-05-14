require('dotenv').config();
const { poolPromise } = require('./src/config/db');

async function runSetup() {
    try {
        const pool = await poolPromise;
        console.log('Running DB Setup...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='dispatch_sequence' AND xtype='U')
            BEGIN
                CREATE TABLE dispatch_sequence (
                    year INT NOT NULL,
                    ps_id INT NOT NULL,
                    last_seq INT NOT NULL DEFAULT 0,
                    PRIMARY KEY (year, ps_id)
                );
                PRINT 'dispatch_sequence created';
            END
            ELSE PRINT 'dispatch_sequence already exists';
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='templates' AND xtype='U')
            BEGIN
                CREATE TABLE templates (
                    template_id INT PRIMARY KEY IDENTITY(1,1),
                    template_name NVARCHAR(255) NOT NULL,
                    template_type NVARCHAR(100) DEFAULT 'Standard',
                    subject_text NVARCHAR(500),
                    body_text NVARCHAR(MAX),
                    footer_text NVARCHAR(MAX),
                    json_data NVARCHAR(MAX),
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'templates created';
            END
            ELSE PRINT 'templates already exists';
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='global_variables' AND xtype='U')
            BEGIN
                CREATE TABLE global_variables (
                    variable_id INT PRIMARY KEY IDENTITY(1,1),
                    variable_name NVARCHAR(100) NOT NULL UNIQUE,
                    variable_value NVARCHAR(500) NOT NULL,
                    description NVARCHAR(500)
                );
                
                -- Insert some default variables
                INSERT INTO global_variables (variable_name, variable_value, description)
                VALUES 
                ('OFFICER_NAME', 'Insp. R.K. Singh', 'Default IO Name'),
                ('POLICE_STATION', 'Cyber PS Jaipur', 'Default PS'),
                ('CONTACT_EMAIL', 'cyber.jpr@rajpolice.gov.in', 'PS Email');

                PRINT 'global_variables created';
            END
            ELSE PRINT 'global_variables already exists';
        `);

        console.log('Setup complete!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

runSetup();
