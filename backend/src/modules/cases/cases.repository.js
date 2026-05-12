/**
 * cases.repository.js — Database access layer for the Cases domain.
 *
 * Centralizes all SQL operations for: cases, case_victims, case_accused,
 * case_notes, case_status_history, case_station_mapping, fir_documents,
 * case_evidence.
 *
 * Each method receives plain data objects and returns plain data — no Express
 * objects (req/res) ever enter here.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const CasesRepository = {

    // ── Case CRUD ─────────────────────────────────────────────────────────────

    /**
     * Insert a new case and return its case_id.
     * Caller provides an mssql.Transaction for multi-step atomicity.
     */
    async insertCase(transaction, fields) {
        const req = new mssql.Request(transaction);
        const result = await req
            .input('fir_no', mssql.NVarChar, fields.fir_no)
            .input('ackn_no', mssql.NVarChar, fields.ackn_no)
            .input('fraud_amount', mssql.Decimal(18, 2), fields.fraud_amount)
            .input('description', mssql.NVarChar, fields.description)
            .input('assigned_to', mssql.Int, fields.assigned_to)
            .input('created_by', mssql.Int, fields.created_by)
            .input('whatsapp_no', mssql.NVarChar, fields.whatsapp_no)
            .input('gmail_id', mssql.NVarChar, fields.gmail_id)
            .input('facebook_id', mssql.NVarChar, fields.facebook_id)
            .input('twitter_id', mssql.NVarChar, fields.twitter_id)
            .input('linkedin_id', mssql.NVarChar, fields.linkedin_id)
            .input('insta_id', mssql.NVarChar, fields.insta_id)
            .input('telegram_id', mssql.NVarChar, fields.telegram_id)
            .input('website_url', mssql.NVarChar, fields.website_url)
            .input('other_social', mssql.NVarChar, fields.other_social)
            .query(`INSERT INTO cases 
                (fir_no, ackn_no, fraud_amount, description, assigned_to, created_by, 
                 whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, 
                 telegram_id, website_url, other_social) 
                OUTPUT INSERTED.case_id 
                VALUES 
                (@fir_no, @ackn_no, @fraud_amount, @description, @assigned_to, @created_by,
                 @whatsapp_no, @gmail_id, @facebook_id, @twitter_id, @linkedin_id, @insta_id,
                 @telegram_id, @website_url, @other_social)`);
        return result.recordset[0].case_id;
    },

    async updateCase(transaction, caseId, fields) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('fir_no', mssql.NVarChar, fields.fir_no)
            .input('ackn_no', mssql.NVarChar, fields.ackn_no)
            .input('fraud_amount', mssql.Decimal(18, 2), fields.fraud_amount)
            .input('description', mssql.NVarChar, fields.description)
            .input('assigned_to', mssql.Int, fields.assigned_to)
            .input('whatsapp_no', mssql.NVarChar, fields.whatsapp_no)
            .input('gmail_id', mssql.NVarChar, fields.gmail_id)
            .input('facebook_id', mssql.NVarChar, fields.facebook_id)
            .input('twitter_id', mssql.NVarChar, fields.twitter_id)
            .input('linkedin_id', mssql.NVarChar, fields.linkedin_id)
            .input('insta_id', mssql.NVarChar, fields.insta_id)
            .input('telegram_id', mssql.NVarChar, fields.telegram_id)
            .input('website_url', mssql.NVarChar, fields.website_url)
            .input('other_social', mssql.NVarChar, fields.other_social)
            .query(`UPDATE cases SET 
                fir_no=@fir_no, ackn_no=@ackn_no, fraud_amount=@fraud_amount, 
                description=@description, assigned_to=@assigned_to, whatsapp_no=@whatsapp_no, 
                gmail_id=@gmail_id, facebook_id=@facebook_id, twitter_id=@twitter_id, 
                linkedin_id=@linkedin_id, insta_id=@insta_id, telegram_id=@telegram_id, 
                website_url=@website_url, other_social=@other_social 
                WHERE case_id=@case_id`);
    },

    async getAll({ policeStationId, isAdmin }) {
        const pool = await poolPromise;
        let query = 'SELECT c.*, u.name as assigned_to_name FROM cases c LEFT JOIN users u ON c.assigned_to = u.user_id';
        const request = pool.request();

        if (policeStationId && !isAdmin) {
            query += ' JOIN case_station_mapping csm ON c.case_id = csm.case_id WHERE csm.police_station_id = @ps_id';
            request.input('ps_id', mssql.Int, policeStationId);
        }
        query += ' ORDER BY c.created_at DESC';
        const result = await request.query(query);
        return result.recordset;
    },

    async getById(caseId, policeStationId) {
        const pool = await poolPromise;
        let query = 'SELECT * FROM cases WHERE case_id = @case_id';
        if (policeStationId) {
            query = `SELECT c.*, ps.station_name, ps.address as station_address, ps.city as station_city 
                     FROM cases c 
                     LEFT JOIN case_station_mapping csm ON c.case_id = csm.case_id 
                     LEFT JOIN police_stations ps ON csm.police_station_id = ps.police_station_id 
                     WHERE c.case_id = @case_id 
                     AND (@ps_id IS NULL OR csm.police_station_id = @ps_id OR csm.police_station_id IS NULL)`;
        }
        const caseReq = pool.request().input('case_id', mssql.Int, caseId);
        if (policeStationId) caseReq.input('ps_id', mssql.Int, policeStationId);

        const [caseR, victimR, firR, evidenceR, transR, notesR, accusedR] = await Promise.all([
            caseReq.query(query),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_victims WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM fir_documents WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_evidence WHERE case_id = @case_id ORDER BY uploaded_at DESC'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_transactions WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT n.*, u.name as author FROM case_notes n JOIN users u ON n.user_id = u.user_id WHERE n.case_id = @case_id ORDER BY n.created_at DESC'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_accused WHERE case_id = @case_id'),
        ]);

        if (caseR.recordset.length === 0) return null;
        return {
            case: caseR.recordset[0],
            victim: victimR.recordset[0],
            fir: firR.recordset[0],
            evidence: evidenceR.recordset,
            transactions: transR.recordset,
            notes: notesR.recordset,
            accusedList: accusedR.recordset,
        };
    },

    async getStatus(caseId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query('SELECT status FROM cases WHERE case_id = @case_id');
        return result.recordset[0]?.status || 'Active';
    },

    async updateStatus(transaction, caseId, status) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('status', mssql.NVarChar, status)
            .query('UPDATE cases SET status = @status WHERE case_id = @case_id');
    },

    async search(query) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('q', mssql.NVarChar, `%${query}%`)
            .query(`
                SELECT DISTINCT c.*, u.name as assigned_to_name 
                FROM cases c 
                LEFT JOIN users u ON c.assigned_to = u.user_id 
                LEFT JOIN case_victims v ON c.case_id = v.case_id
                WHERE c.fir_no LIKE @q OR c.ackn_no LIKE @q 
                OR v.mobile LIKE @q OR v.account_no LIKE @q
            `);
        return result.recordset;
    },

    // ── Status History ────────────────────────────────────────────────────────

    async insertStatusHistory(transaction, { caseId, oldStatus, newStatus, updatedBy, reason }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('old_status', mssql.NVarChar, oldStatus)
            .input('new_status', mssql.NVarChar, newStatus)
            .input('updated_by', mssql.Int, updatedBy)
            .input('reason', mssql.NVarChar, reason)
            .query('INSERT INTO case_status_history (case_id, old_status, new_status, updated_by, reason) VALUES (@case_id, @old_status, @new_status, @updated_by, @reason)');
    },

    // ── Victim ────────────────────────────────────────────────────────────────

    async insertVictim(transaction, { caseId, name, mobile, email, address, bank_name, account_no }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, name)
            .input('mobile', mssql.NVarChar, mobile)
            .input('email', mssql.NVarChar, email)
            .input('address', mssql.NVarChar, address)
            .input('bank_name', mssql.NVarChar, bank_name)
            .input('account_no', mssql.NVarChar, account_no)
            .query('INSERT INTO case_victims (case_id, name, mobile, email, address, bank_name, account_no) VALUES (@case_id, @name, @mobile, @email, @address, @bank_name, @account_no)');
    },

    async updateVictim(transaction, { caseId, name, mobile, email, address, bank_name, account_no }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, name)
            .input('mobile', mssql.NVarChar, mobile)
            .input('email', mssql.NVarChar, email)
            .input('address', mssql.NVarChar, address)
            .input('bank_name', mssql.NVarChar, bank_name)
            .input('account_no', mssql.NVarChar, account_no)
            .query('UPDATE case_victims SET name=@name, mobile=@mobile, email=@email, address=@address, bank_name=@bank_name, account_no=@account_no WHERE case_id=@case_id');
    },

    // ── Accused ───────────────────────────────────────────────────────────────

    async insertAccused(transaction, caseId, acc) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, acc.name || '')
            .input('alias', mssql.NVarChar, acc.alias || '')
            .input('mobile', mssql.NVarChar, acc.mobile || '')
            .input('whatsapp_no', mssql.NVarChar, acc.whatsapp_no || '')
            .input('gmail_id', mssql.NVarChar, acc.gmail_id || '')
            .input('facebook_id', mssql.NVarChar, acc.facebook_id || '')
            .input('twitter_id', mssql.NVarChar, acc.twitter_id || '')
            .input('linkedin_id', mssql.NVarChar, acc.linkedin_id || '')
            .input('insta_id', mssql.NVarChar, acc.insta_id || '')
            .input('telegram_id', mssql.NVarChar, acc.telegram_id || '')
            .input('website_url', mssql.NVarChar, acc.website_url || '')
            .input('other_social', mssql.NVarChar, acc.other_social || '')
            .query(`INSERT INTO case_accused 
                (case_id, name, alias, mobile, whatsapp_no, gmail_id, facebook_id, 
                 twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social)
                VALUES 
                (@case_id, @name, @alias, @mobile, @whatsapp_no, @gmail_id, @facebook_id,
                 @twitter_id, @linkedin_id, @insta_id, @telegram_id, @website_url, @other_social)`);
    },

    async updateAccused(transaction, acc) {
        await new mssql.Request(transaction)
            .input('accused_id', mssql.Int, acc.accused_id)
            .input('name', mssql.NVarChar, acc.name || '')
            .input('alias', mssql.NVarChar, acc.alias || '')
            .input('mobile', mssql.NVarChar, acc.mobile || '')
            .input('whatsapp_no', mssql.NVarChar, acc.whatsapp_no || '')
            .input('gmail_id', mssql.NVarChar, acc.gmail_id || '')
            .input('facebook_id', mssql.NVarChar, acc.facebook_id || '')
            .input('twitter_id', mssql.NVarChar, acc.twitter_id || '')
            .input('linkedin_id', mssql.NVarChar, acc.linkedin_id || '')
            .input('insta_id', mssql.NVarChar, acc.insta_id || '')
            .input('telegram_id', mssql.NVarChar, acc.telegram_id || '')
            .input('website_url', mssql.NVarChar, acc.website_url || '')
            .input('other_social', mssql.NVarChar, acc.other_social || '')
            .query(`UPDATE case_accused SET 
                name=@name, alias=@alias, mobile=@mobile, whatsapp_no=@whatsapp_no, 
                gmail_id=@gmail_id, facebook_id=@facebook_id, twitter_id=@twitter_id, 
                linkedin_id=@linkedin_id, insta_id=@insta_id, telegram_id=@telegram_id, 
                website_url=@website_url, other_social=@other_social 
                WHERE accused_id=@accused_id`);
    },

    async deleteAccusedByCase(transaction, caseId) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .query('DELETE FROM case_accused WHERE case_id=@case_id');
    },

    // ── Station Mapping ───────────────────────────────────────────────────────

    async insertStationMapping(transaction, { caseId, policeStationId }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('ps_id', mssql.Int, policeStationId)
            .query('INSERT INTO case_station_mapping (case_id, police_station_id) VALUES (@case_id, @ps_id)');
    },

    // ── FIR Documents ─────────────────────────────────────────────────────────

    async insertFirDocument(transaction, { caseId, filePath, fileName, fileType }) {
        const req = transaction ? new mssql.Request(transaction) : (await poolPromise).request();
        await req
            .input('case_id', mssql.Int, caseId)
            .input('file_path', mssql.NVarChar, filePath)
            .input('file_name', mssql.NVarChar, fileName)
            .input('file_type', mssql.NVarChar, fileType)
            .query('INSERT INTO fir_documents (case_id, file_path, file_name, file_type) VALUES (@case_id, @file_path, @file_name, @file_type)');
    },

    async getFirDocumentById(docId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('doc_id', mssql.Int, docId)
            .query('SELECT file_path, case_id FROM fir_documents WHERE doc_id = @doc_id');
        return result.recordset[0] || null;
    },

    async deleteFirDocument(transaction, docId) {
        await new mssql.Request(transaction)
            .input('doc_id', mssql.Int, docId)
            .query('DELETE FROM fir_documents WHERE doc_id = @doc_id');
    },

    /**
     * Save a PDF notice into fir_documents (old saveNotice in caseController).
     * Renamed to clarify its purpose: it saves a generated PDF artifact.
     */
    async insertPdfNotice(pool, { caseId, filePath }) {
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('type', mssql.NVarChar, 'Legal Notice')
            .input('path', mssql.NVarChar, filePath)
            .query('INSERT INTO fir_documents (case_id, document_type, file_path) VALUES (@case_id, @type, @path)');
    },

    // ── Evidence ──────────────────────────────────────────────────────────────

    async insertEvidence(pool, { caseId, filePath, fileName, description }) {
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('file_path', mssql.NVarChar, filePath)
            .input('file_name', mssql.NVarChar, fileName)
            .input('description', mssql.NVarChar, description)
            .query('INSERT INTO case_evidence (case_id, file_path, file_name, description) VALUES (@case_id, @file_path, @file_name, @description)');
    },

    async getEvidenceById(evidenceId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('evidence_id', mssql.Int, evidenceId)
            .query('SELECT file_path, case_id, description FROM case_evidence WHERE evidence_id = @evidence_id');
        return result.recordset[0] || null;
    },

    async deleteEvidence(transaction, evidenceId) {
        await new mssql.Request(transaction)
            .input('evidence_id', mssql.Int, evidenceId)
            .query('DELETE FROM case_evidence WHERE evidence_id = @evidence_id');
    },

    // ── Notes ─────────────────────────────────────────────────────────────────

    async insertNote({ caseId, userId, noteText }) {
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('user_id', mssql.Int, userId)
            .input('note_text', mssql.NVarChar, noteText)
            .query('INSERT INTO case_notes (case_id, user_id, note_text) VALUES (@case_id, @user_id, @note_text)');
    },

    // ── Transactions (linked to cases) ────────────────────────────────────────

    async deleteTransactionsByCase(transaction, caseId) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .query('DELETE FROM case_transactions WHERE case_id = @case_id');
    },

    // ── Pool access for operations that need it ───────────────────────────────
    async getPool() {
        return poolPromise;
    },

    getMssql() {
        return mssql;
    },
};

module.exports = CasesRepository;
