'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { poolPromise, mssql } = require('../config/db');

async function fix() {
    console.log('--- Database Path Synchronization Active ---');
    try {
        const pool = await poolPromise;
        
        // Fetch all notices for case 6
        const result = await pool.request()
            .input('caseId', mssql.Int, 6)
            .query("SELECT doc_id, file_path, file_name FROM fir_documents WHERE case_id = @caseId AND file_type = 'Legal Notice'");
        
        const docs = result.recordset;
        console.log(`Analyzing ${docs.length} records for Case #6...`);

        for (const doc of docs) {
            // Target: uploads/notices/6/6_Axis_Bank_1.pdf -> 6_Axis_Bank.pdf
            const currentFileName = doc.file_name;
            const dir = path.join(__dirname, '../../uploads/notices/6');
            
            // If DB says _1.pdf but disk has .pdf
            if (currentFileName.includes('_1.pdf')) {
                const healedName = currentFileName.replace('_1.pdf', '.pdf');
                const healedPath = path.join(dir, healedName);

                if (fs.existsSync(healedPath)) {
                    console.log(`Fixing: ${currentFileName} -> ${healedName}`);
                    
                    const newPath = `/uploads/notices/6/${healedName}`;
                    
                    await pool.request()
                        .input('id', mssql.Int, doc.doc_id)
                        .input('p', mssql.NVarChar, newPath)
                        .input('n', mssql.NVarChar, healedName)
                        .query('UPDATE fir_documents SET file_path = @p, file_name = @n WHERE doc_id = @id');
                }
            }
        }

        console.log('--- Sync Complete. Please refresh your browser. ---');
        process.exit(0);
    } catch (err) {
        console.error('Sync Error:', err);
        process.exit(1);
    }
}

fix();
