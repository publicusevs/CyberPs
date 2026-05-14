require('dotenv').config();
const { poolPromise } = require('./src/config/db');

async function runSetup() {
    try {
        const pool = await poolPromise;
        console.log('Running DB Setup 2...');

        try {
            await pool.request().query("ALTER TABLE global_variables ADD description NVARCHAR(500);");
            console.log('Added description column to global_variables');
        } catch (e) {
            console.log('Description column may already exist or table missing:', e.message);
        }

        try {
            await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM global_variables)
            BEGIN
                INSERT INTO global_variables (variable_name, variable_value, description)
                VALUES 
                ('OFFICER_NAME', 'Insp. R.K. Singh', 'Default IO Name'),
                ('POLICE_STATION', 'Cyber PS Jaipur', 'Default PS'),
                ('CONTACT_EMAIL', 'cyber.jpr@rajpolice.gov.in', 'PS Email');
                PRINT 'global_variables populated';
            END
            `);
            console.log('global_variables populated');
        } catch (e) {
            console.log('Error populating global_variables:', e.message);
        }

        console.log('Setup complete!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

runSetup();
