/**
 * Migration: Add layer & ifsc_code columns to case_transactions
 * Run once: node add_layer_column.js
 */
require('dotenv').config();
const { poolPromise } = require('./src/config/db');

(async () => {
    try {
        const pool = await poolPromise;
        console.log('[DB] Connected');

        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID('case_transactions') AND name = 'layer'
            )
            BEGIN
                ALTER TABLE case_transactions ADD layer NVARCHAR(20) NULL;
                PRINT 'layer column added';
            END
            ELSE
                PRINT 'layer column already exists';
        `);

        await pool.request().query(`
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID('case_transactions') AND name = 'ifsc_code'
            )
            BEGIN
                ALTER TABLE case_transactions ADD ifsc_code NVARCHAR(20) NULL;
                PRINT 'ifsc_code column added';
            END
            ELSE
                PRINT 'ifsc_code column already exists';
        `);

        console.log('[DB] Migration complete: layer & ifsc_code columns ready');
        process.exit(0);
    } catch (err) {
        console.error('[DB] Migration failed:', err.message);
        process.exit(1);
    }
})();
