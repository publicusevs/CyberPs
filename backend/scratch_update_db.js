require('dotenv').config();
const { poolPromise, mssql } = require('./src/config/db');

async function updateDb() {
    try {
        const pool = await poolPromise;
        console.log('Running DB Migration...');

        // Add layer column
        try {
            await pool.request().query("ALTER TABLE case_transactions ADD layer NVARCHAR(50) DEFAULT 'Layer 1';");
            console.log('Added layer column.');
        } catch (e) {
            console.log('Layer column might already exist:', e.message);
        }

        // Add source_file column
        try {
            await pool.request().query("ALTER TABLE case_transactions ADD source_file NVARCHAR(255) DEFAULT 'Legacy Data';");
            console.log('Added source_file column.');
        } catch (e) {
            console.log('Source_file column might already exist:', e.message);
        }

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

updateDb();
