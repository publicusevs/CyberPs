'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { poolPromise, mssql } = require('../config/db');

async function heal() {
    console.log('--- Starting Forensic Path Healing ---');
    try {
        const pool = await poolPromise;
        
        // 1. Get all documents that might have path mismatches
        const result = await pool.request()
            .query("SELECT doc_id, case_id, file_path, file_name FROM fir_documents WHERE file_type = 'Legal Notice'");
        
        const docs = result.recordset;
        console.log(`Found ${docs.length} Legal Notice records to verify.`);

        let fixedCount = 0;

        for (const doc of docs) {
            // Path in DB: /uploads/notices/6/6_Bank_1.pdf
            // Physical Path: e:\cyberhunter\backend\uploads\notices\6\6_Bank_1.pdf
            
            const relativePath = doc.file_path.replace(/^\//, '');
            const physicalPath = path.resolve(__dirname, '../../', relativePath);

            if (!fs.existsSync(physicalPath)) {
                console.log(`Mismatch detected: ${doc.file_name} (Not found at ${physicalPath})`);
                
                // Try to find if the file exists WITHOUT the _1, _2 suffix
                // Example: 6_Bank_1.pdf -> 6_Bank.pdf
                const dir = path.dirname(physicalPath);
                const baseName = path.basename(physicalPath, '.pdf');
                
                // Remove trailing _X
                const cleanedBaseName = baseName.replace(/_\d+$/, '');
                const healedPath = path.join(dir, cleanedBaseName + '.pdf');

                if (fs.existsSync(healedPath)) {
                    console.log(`Healed: Found physical file at ${healedPath}`);
                    
                    const newFileName = cleanedBaseName + '.pdf';
                    const newFilePath = `/uploads/notices/${doc.case_id}/${newFileName}`;

                    await pool.request()
                        .input('doc_id', mssql.Int, doc.doc_id)
                        .input('new_path', mssql.NVarChar, newFilePath)
                        .input('new_name', mssql.NVarChar, newFileName)
                        .query('UPDATE fir_documents SET file_path = @new_path, file_name = @new_name WHERE doc_id = @doc_id');
                    
                    fixedCount++;
                } else {
                    console.log(`CRITICAL: No version of ${doc.file_name} found on disk.`);
                }
            }
        }

        console.log(`--- Healing Complete. Fixed ${fixedCount} records. ---`);
        process.exit(0);

    } catch (err) {
        console.error('Healing failed:', err);
        process.exit(1);
    }
}

heal();
