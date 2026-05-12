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
};

module.exports = NoticesRepository;
