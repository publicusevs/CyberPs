/**
 * export_seed_data.js
 * 
 * Purpose: Connects to the local database, extracts all user-created 
 * notice_templates and global_variables, and saves them to seed_data.json.
 * 
 * This ensures that when the portable executable is installed on a fresh machine,
 * it includes the exact templates and variables created by the developer.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../config/db');

async function exportSeedData() {
    console.log('[EXPORT] Connecting to database...');
    const pool = await poolPromise;
    if (!pool) {
        console.error('[EXPORT] Cannot connect to database. Aborting export.');
        process.exit(1);
    }

    try {
        console.log('[EXPORT] Fetching notice_templates...');
        const templatesResult = await pool.request().query('SELECT * FROM notice_templates');
        
        console.log('[EXPORT] Fetching global_variables...');
        const variablesResult = await pool.request().query('SELECT * FROM global_variables');

        const seedData = {
            notice_templates: templatesResult.recordset || [],
            global_variables: variablesResult.recordset || []
        };

        const outputPath = path.join(__dirname, '..', '..', 'seed_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2), 'utf8');
        
        console.log(`[EXPORT SUCCESS] Exported ${seedData.notice_templates.length} templates and ${seedData.global_variables.length} variables.`);
        console.log(`[EXPORT SUCCESS] Saved to: ${outputPath}`);
    } catch (err) {
        console.error('[EXPORT ERROR] Failed to export seed data:', err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

exportSeedData();
