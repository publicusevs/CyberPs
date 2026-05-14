/**
 * notices.repository.js — Database access layer for Legal Notices.
 *
 * Handles legal_notices table (structured notice records).
 * Note: PDF-to-fir_documents saving is in cases.repository.insertPdfNotice.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const NoticesRepository = {

    async insert({ caseId, policeStationId, platformName, legalSections, issuedBy,
        receiverName, receiverAddress, receiverEmail, targetAccountDetails,
        requestedDataPoints, noticeContent, status }) {
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('ps_id', mssql.Int, policeStationId)
            .input('platform', mssql.NVarChar, platformName)
            .input('sections', mssql.NVarChar, JSON.stringify(legalSections))
            .input('issued_by', mssql.NVarChar, issuedBy)
            .input('recv_name', mssql.NVarChar, receiverName)
            .input('recv_addr', mssql.NVarChar, receiverAddress)
            .input('recv_email', mssql.NVarChar, receiverEmail)
            .input('target_acc', mssql.NVarChar, JSON.stringify(targetAccountDetails))
            .input('req_data', mssql.NVarChar, JSON.stringify(requestedDataPoints))
            .input('content', mssql.NVarChar, noticeContent)
            .input('status', mssql.NVarChar, status || 'Draft')
            .query(`INSERT INTO legal_notices 
                (case_id, police_station_id, platform_name, legal_sections, issued_by, receiver_name, 
                 receiver_address, receiver_email, target_account_details, requested_data_points, notice_content, status)
                VALUES 
                (@case_id, @ps_id, @platform, @sections, @issued_by, @recv_name, 
                 @recv_addr, @recv_email, @target_acc, @req_data, @content, @status)`);
    },

    async getByCase(caseId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query('SELECT * FROM legal_notices WHERE case_id = @case_id ORDER BY created_at DESC');
        return result.recordset;
    },

    async getById(noticeId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('notice_id', mssql.Int, noticeId)
            .query('SELECT * FROM legal_notices WHERE notice_id = @notice_id');
        return result.recordset[0] || null;
    },

    async update(noticeId, { noticeContent, status }) {
        const pool = await poolPromise;
        await pool.request()
            .input('notice_id', mssql.Int, noticeId)
            .input('content', mssql.NVarChar, noticeContent)
            .input('status', mssql.NVarChar, status)
            .query('UPDATE legal_notices SET notice_content = @content, status = @status, updated_at = GETDATE() WHERE notice_id = @notice_id');
    },

    /**
     * Atomically get the next dispatch sequence number for a given year + police_station.
     * Uses dispatch_sequence table (UPSERT pattern).
     */
    async getNextDispatchSeq(year, psId) {
        const pool = await poolPromise;
        // MERGE upsert: insert if new year+ps combo, then increment
        const result = await pool.request()
            .input('year', mssql.Int, year)
            .input('ps_id', mssql.Int, psId)
            .query(`
                MERGE dispatch_sequence AS target
                USING (SELECT @year AS year, @ps_id AS ps_id) AS source
                ON (target.year = source.year AND target.ps_id = source.ps_id)
                WHEN MATCHED THEN
                    UPDATE SET last_seq = last_seq + 1
                WHEN NOT MATCHED THEN
                    INSERT (year, ps_id, last_seq) VALUES (@year, @ps_id, 1);

                SELECT last_seq FROM dispatch_sequence
                WHERE year = @year AND ps_id = @ps_id;
            `);
        return result.recordset[0].last_seq;
    },

    /**
     * Insert a new generated notice into legal_notices with dispatch fields.
     * Uses the new columns added to the existing legal_notices table.
     */
    async insertWithDispatch({ caseId, policeStationId, bankName, noticeTypeCode, noticeCategory,
        issuedBy, dispatchNo, selectedAccounts, status }) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('ps_id', mssql.Int, policeStationId)
            .input('platform', mssql.NVarChar, bankName)
            .input('issued_by', mssql.NVarChar, issuedBy)
            .input('dispatch_no', mssql.NVarChar, dispatchNo)
            .input('notice_category', mssql.NVarChar, noticeCategory || 'BANK')
            .input('notice_type_code', mssql.NVarChar, noticeTypeCode)
            .input('selected_accounts', mssql.NVarChar, JSON.stringify(selectedAccounts || []))
            .input('status', mssql.NVarChar, status || 'Generated')
            .input('sections', mssql.NVarChar, '[]')
            .input('target_acc', mssql.NVarChar, JSON.stringify(selectedAccounts || []))
            .input('req_data', mssql.NVarChar, JSON.stringify([noticeTypeCode]))
            .input('content', mssql.NVarChar, '')
            .query(`
                INSERT INTO legal_notices
                    (case_id, police_station_id, platform_name, legal_sections, issued_by,
                     receiver_name, receiver_address, receiver_email, target_account_details,
                     requested_data_points, notice_content, status,
                     dispatch_no, notice_category, notice_type_code, selected_accounts)
                OUTPUT INSERTED.notice_id
                VALUES
                    (@case_id, @ps_id, @platform, @sections, @issued_by,
                     @platform, NULL, NULL, @target_acc,
                     @req_data, @content, @status,
                     @dispatch_no, @notice_category, @notice_type_code, @selected_accounts)
            `);
        return result.recordset[0].notice_id;
    },

    /**
     * Fetch all notices for a case that have a dispatch_no (i.e., generated via the engine).
     * Returns the dispatch register view sorted newest-first.
     */
    async getDispatchByCaseId(caseId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query(`
                SELECT
                    notice_id,
                    dispatch_no,
                    platform_name   AS bank_name,
                    notice_category,
                    notice_type_code,
                    issued_by,
                    status,
                    created_at,
                    selected_accounts,
                    notice_content
                FROM legal_notices
                WHERE case_id = @case_id
                  AND dispatch_no IS NOT NULL
                ORDER BY created_at DESC
            `);
        return result.recordset;
    },
};

module.exports = NoticesRepository;
