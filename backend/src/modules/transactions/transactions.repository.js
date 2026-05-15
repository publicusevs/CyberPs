/**
 * transactions.repository.js — Database access layer for case transactions.
 *
 * Canonical addTransaction uses: case_id, sender_acc, receiver_acc, amount,
 * utr_no, trans_date, platform — matching the full DB schema.
 * (The duplicate in caseController with 'transaction_date' field is superseded.)
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const TransactionsRepository = {

    /**
     * Insert a single transaction (canonical version with 'platform' field).
     * @param {object} tx
     */
    async insertOne({ case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform }) {
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, case_id)
            .input('sender_acc', mssql.NVarChar, sender_acc)
            .input('receiver_acc', mssql.NVarChar, receiver_acc)
            .input('amount', mssql.Decimal(18, 2), amount)
            .input('utr_no', mssql.NVarChar, utr_no)
            .input('trans_date', mssql.DateTime, trans_date)
            .input('platform', mssql.NVarChar, platform)
            .query('INSERT INTO case_transactions (case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform) VALUES (@case_id, @sender_acc, @receiver_acc, @amount, @utr_no, @trans_date, @platform)');
    },

    /**
     * Bulk insert multiple transactions using MSSQL bulk API.
     * Falls back to row-by-row on error.
     * @param {Array} rows - Array of transaction objects
     * @returns {Promise<{method: string, count: number}>}
     */
    async bulkInsert(rows) {
        const pool = await poolPromise;

        // Check if layer/ifsc_code/source_file columns exist (migration-safe)
        const colCheck = await pool.request().query(`
            SELECT name FROM sys.columns 
            WHERE object_id = OBJECT_ID('case_transactions') 
            AND name IN ('layer', 'ifsc_code', 'source_file')
        `);
        const existingCols = colCheck.recordset.map(r => r.name);
        const hasLayer = existingCols.includes('layer');
        const hasIfsc = existingCols.includes('ifsc_code');
        const hasSourceFile = existingCols.includes('source_file');

        try {
            const table = new mssql.Table('case_transactions');
            table.create = false;
            table.columns.add('case_id', mssql.Int, { nullable: false });
            table.columns.add('sender_acc', mssql.NVarChar(50), { nullable: true });
            table.columns.add('receiver_acc', mssql.NVarChar(50), { nullable: true });
            table.columns.add('amount', mssql.Decimal(18, 2), { nullable: true });
            table.columns.add('utr_no', mssql.NVarChar(100), { nullable: true });
            table.columns.add('trans_date', mssql.DateTime, { nullable: true });
            table.columns.add('platform', mssql.NVarChar(50), { nullable: true });
            if (hasLayer)       table.columns.add('layer', mssql.NVarChar(50), { nullable: true });
            if (hasIfsc)        table.columns.add('ifsc_code', mssql.NVarChar(20), { nullable: true });
            if (hasSourceFile)  table.columns.add('source_file', mssql.NVarChar(255), { nullable: true });

            for (const r of rows) {
                const rowData = [r.case_id, r.sender_acc, r.receiver_acc, r.amount, r.utr_no, r.trans_date, r.platform];
                if (hasLayer)       rowData.push(r.layer || null);
                if (hasIfsc)        rowData.push(r.ifsc_code || null);
                if (hasSourceFile)  rowData.push(r.source_file || null);
                table.rows.add(...rowData);
            }

            await pool.request().bulk(table);
            return { method: 'bulk', count: rows.length };
        } catch {
            // Fallback: row-by-row insert
            let inserted = 0;
            for (const r of rows) {
                try {
                    const req = pool.request()
                        .input('case_id',      mssql.Int,            r.case_id)
                        .input('sender_acc',   mssql.NVarChar,       r.sender_acc)
                        .input('receiver_acc', mssql.NVarChar,       r.receiver_acc)
                        .input('amount',       mssql.Decimal(18, 2), r.amount)
                        .input('utr_no',       mssql.NVarChar,       r.utr_no)
                        .input('trans_date',   mssql.DateTime,       r.trans_date)
                        .input('platform',     mssql.NVarChar,       r.platform);

                    let cols = 'case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform';
                    let vals = '@case_id, @sender_acc, @receiver_acc, @amount, @utr_no, @trans_date, @platform';

                    if (hasLayer) {
                        req.input('layer', mssql.NVarChar, r.layer || null);
                        cols += ', layer'; vals += ', @layer';
                    }
                    if (hasIfsc) {
                        req.input('ifsc_code', mssql.NVarChar, r.ifsc_code || null);
                        cols += ', ifsc_code'; vals += ', @ifsc_code';
                    }
                    if (hasSourceFile) {
                        req.input('source_file', mssql.NVarChar, r.source_file || null);
                        cols += ', source_file'; vals += ', @source_file';
                    }

                    await req.query(`INSERT INTO case_transactions (${cols}) VALUES (${vals})`);
                    inserted++;
                } catch (rowErr) {
                    // Skip bad rows
                }
            }
            return { method: 'row-by-row', count: inserted };
        }
    },

    /**
     * Delete all transactions for a case (used before re-import).
     */
    async deleteByCase(caseId) {
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query('DELETE FROM case_transactions WHERE case_id = @case_id');
    },

    /**
     * Fetch all transactions for a case.
     */
    async getByCase(caseId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, parseInt(caseId))
            .query('SELECT * FROM case_transactions WHERE case_id = @case_id ORDER BY trans_date ASC');
        return result.recordset;
    },

    /**
     * Search transactions by account or UTR number.
     */
    async search(query) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('q', mssql.NVarChar, `%${query}%`)
            .query('SELECT t.*, c.fir_no FROM case_transactions t JOIN cases c ON t.case_id = c.case_id WHERE t.sender_acc LIKE @q OR t.receiver_acc LIKE @q OR t.utr_no LIKE @q');
        return result.recordset;
    },

    /**
     * Add evidence record for an imported excel file.
     */
    async insertExcelEvidence(pool, { caseId, filePath, fileName }) {
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('file_path', mssql.NVarChar, filePath)
            .input('file_name', mssql.NVarChar, fileName)
            .input('description', mssql.NVarChar, 'Forensic Money Trail Excel Artifact')
            .query('INSERT INTO case_evidence (case_id, file_path, file_name, description) VALUES (@case_id, @file_path, @file_name, @description)');
    },

    async getPool() {
        return poolPromise;
    },
};

module.exports = TransactionsRepository;
