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
const fs = require('fs');
const path = require('path');

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
            .input('sho_name', mssql.NVarChar, fields.sho_details || fields.sho_name || null)
            .input('remarks', mssql.NVarChar, fields.remarks || null)
            .query(`INSERT INTO cases 
                (fir_no, ackn_no, fraud_amount, description, assigned_to, created_by, 
                 whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, 
                 telegram_id, website_url, other_social, sho_name, remarks) 
                OUTPUT INSERTED.case_id 
                VALUES 
                (@fir_no, @ackn_no, @fraud_amount, @description, @assigned_to, @created_by,
                 @whatsapp_no, @gmail_id, @facebook_id, @twitter_id, @linkedin_id, @insta_id,
                 @telegram_id, @website_url, @other_social, @sho_name, @remarks)`);
        return result.recordset[0].case_id;
    },

    async updateCase(transaction, caseId, fields) {
        const toInt = (v) => {
            const n = parseInt(v, 10);
            return isNaN(n) ? null : n;
        };

        const combineDateTime = (dateStr, timeStr) => {
            if (!dateStr) return null;
            const clean = dateStr.trim();
            if (!timeStr) return new Date(clean);
            return new Date(`${clean}T${timeStr.trim()}`);
        };

        const fir_datetime = combineDateTime(fields.fir_date, fields.fir_time);
        const occurrence_from_datetime = combineDateTime(fields.occurrence_date_from, fields.occurrence_time_from);
        const occurrence_to_datetime = combineDateTime(fields.occurrence_date_to, fields.occurrence_time_to);
        const info_received_datetime = combineDateTime(fields.info_received_date, fields.info_received_time);

        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('fir_no', mssql.NVarChar, fields.fir_no)
            .input('ackn_no', mssql.NVarChar, fields.ackn_no || null)
            .input('fir_year', mssql.Int, toInt(fields.fir_year))
            .input('district_id', mssql.Int, toInt(fields.district_id || fields.district))
            .input('police_station_id', mssql.Int, toInt(fields.police_station_id || fields.police_station))
            .input('fir_datetime', mssql.DateTime, fir_datetime)
            .input('occurrence_from_datetime', mssql.DateTime, occurrence_from_datetime || null)
            .input('occurrence_to_datetime', mssql.DateTime, occurrence_to_datetime || null)
            .input('info_received_datetime', mssql.DateTime, info_received_datetime || null)
            .input('gd_entry_no', mssql.NVarChar, fields.gd_no || fields.gd_entry_no || null)
            .input('place_of_occurrence', mssql.NVarChar, fields.place_of_occurrence || fields.place_of_incident || null)
            .input('fraud_amount', mssql.Decimal(18, 2), fields.fraud_amount ? parseFloat(fields.fraud_amount) : null)
            .input('description', mssql.NVarChar, fields.description || fields.fir_narrative || null)
            .input('assigned_to', mssql.Int, toInt(fields.assigned_to))
            .input('status_id', mssql.Int, fields.status_id ? toInt(fields.status_id) : 1)
            .input('priority_id', mssql.Int, fields.priority_id ? toInt(fields.priority_id) : null)
            .input('sho_name', mssql.NVarChar, fields.sho_details || fields.sho_name || null)
            .input('remarks', mssql.NVarChar, fields.remarks || null)
            .query(`UPDATE cases SET 
                fir_no=@fir_no, 
                ackn_no=@ackn_no, 
                fir_year=@fir_year,
                district_id=@district_id,
                police_station_id=@police_station_id,
                fir_datetime=@fir_datetime,
                occurrence_from_datetime=@occurrence_from_datetime,
                occurrence_to_datetime=@occurrence_to_datetime,
                info_received_datetime=@info_received_datetime,
                gd_entry_no=@gd_entry_no,
                place_of_occurrence=@place_of_occurrence,
                fraud_amount=@fraud_amount, 
                fir_narrative=@description, 
                description=@description, 
                assigned_to=@assigned_to, 
                status_id=@status_id,
                priority_id=@priority_id,
                sho_name=@sho_name,
                remarks=@remarks
                WHERE case_id=@case_id`);
    },

    async updateShoAndRemarks(transaction, caseId, shoName, remarks) {
        const req = transaction ? new mssql.Request(transaction) : (await poolPromise).request();
        await req
            .input('case_id', mssql.Int, caseId)
            .input('sho_name', mssql.NVarChar, shoName || null)
            .input('remarks', mssql.NVarChar, remarks || null)
            .query('UPDATE cases SET sho_name=@sho_name, remarks=@remarks WHERE case_id=@case_id');
    },

    async updateComplainant(transaction, { caseId, name, mobile, email, aadhar_no, pan_no, address }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, name || null)
            .input('mobile', mssql.NVarChar, mobile || null)
            .input('email', mssql.NVarChar, email || null)
            .input('aadhar_no', mssql.NVarChar, aadhar_no || null)
            .input('pan_no', mssql.NVarChar, pan_no || null)
            .input('address', mssql.NVarChar, address || null)
            .query(`
                IF EXISTS (SELECT 1 FROM case_complainants WHERE case_id = @case_id)
                BEGIN
                    UPDATE case_complainants SET 
                        name = @name,
                        mobile = @mobile,
                        email = @email,
                        aadhar_no = @aadhar_no,
                        pan_no = @pan_no,
                        address = @address,
                        updated_at = GETDATE()
                    WHERE case_id = @case_id
                END
                ELSE
                BEGIN
                    INSERT INTO case_complainants (case_id, name, mobile, email, aadhar_no, pan_no, address, created_at)
                    VALUES (@case_id, @name, @mobile, @email, @aadhar_no, @pan_no, @address, GETDATE())
                END
            `);
    },

    async getAll({ policeStationId, isAdmin }) {
        const pool = await poolPromise;
        let query = 'SELECT c.*, u.name as assigned_to_name FROM cases c LEFT JOIN users u ON c.assigned_to = u.user_id';
        const request = pool.request();

        if (policeStationId && !isAdmin) {
            query += ' WHERE c.police_station_id = @ps_id';
            request.input('ps_id', mssql.Int, policeStationId);
        }
        query += ' ORDER BY c.created_at DESC';
        const result = await request.query(query);
        return result.recordset;
    },

    async getById(caseId, policeStationId) {
        const pool = await poolPromise;
        let query = `SELECT c.*, ps.station_name, ps.address as station_address, ps.city as station_city 
                     FROM cases c 
                     LEFT JOIN police_stations ps ON c.police_station_id = ps.police_station_id 
                     WHERE c.case_id = @case_id`;
        if (policeStationId) {
            query += ` AND (@ps_id IS NULL OR c.police_station_id = @ps_id OR c.police_station_id IS NULL)`;
        }
        const caseReq = pool.request().input('case_id', mssql.Int, caseId);
        if (policeStationId) caseReq.input('ps_id', mssql.Int, policeStationId);

        const [caseR, victimR, firR, evidenceR, transR, notesR, accusedR, complainantR] = await Promise.all([
            caseReq.query(query),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_victims WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM fir_documents WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_evidence WHERE case_id = @case_id ORDER BY uploaded_at DESC'),
            pool.request().input('case_id', mssql.Int, caseId).query(`
                SELECT ct.*,
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('case_transactions') AND name = 'layer')
                        THEN 1 ELSE 0 
                    END AS has_layer_col
                FROM case_transactions ct
                WHERE ct.case_id = @case_id
                ORDER BY ct.trans_date ASC`),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT n.*, u.name as author FROM case_notes n JOIN users u ON n.user_id = u.user_id WHERE n.case_id = @case_id ORDER BY n.created_at DESC'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_accused WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, caseId).query('SELECT * FROM case_complainants WHERE case_id = @case_id'),
        ]);

        if (caseR.recordset.length === 0) return null;

        // --- Self-Healing File Paths ---
        const healedDocs = firR.recordset.map(doc => {
            const relativePath = doc.file_path.replace(/^\//, '');
            const physicalPath = path.resolve(process.cwd(), relativePath);

            if (!fs.existsSync(physicalPath)) {
                // Try removing _1, _2 suffix
                const dir = path.dirname(physicalPath);
                const base = path.basename(physicalPath, '.pdf');
                const cleanedBase = base.replace(/_\d+$/, '');
                const fallbackPath = path.join(dir, cleanedBase + '.pdf');

                if (fs.existsSync(fallbackPath)) {
                    const healedFileName = cleanedBase + '.pdf';
                    return {
                        ...doc,
                        file_path: `/uploads/notices/${doc.case_id}/${healedFileName}`,
                        file_name: healedFileName
                    };
                }
            }
            return doc;
        });

        return {
            case: caseR.recordset[0],
            victim: victimR.recordset[0],
            complainant: complainantR.recordset[0] || null,
            fir: healedDocs[0],
            fir_docs: healedDocs,
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

    /**
     * Executes the Enterprise Master Stored Procedure for Case Registration.
     * Maps all normalized form data into a single transactional SP call.
     */
    async registerCyberCrimeCase(params) {
        const pool = await poolPromise;
        const request = pool.request();

        // Phase 1: Core Details
        request.input('fir_no', mssql.NVarChar, params.fir_no);
        request.input('ackn_no', mssql.NVarChar, params.ackn_no || null);
        request.input('fir_year', mssql.Int, parseInt(params.fir_year));
        request.input('district_id', mssql.Int, parseInt(params.district_id));
        request.input('police_station_id', mssql.Int, parseInt(params.police_station_id));
        request.input('fir_datetime', mssql.DateTime, params.fir_datetime);
        request.input('info_received_datetime', mssql.DateTime, params.info_received_datetime || null);
        request.input('gd_entry_no', mssql.NVarChar, params.gd_entry_no || null);

        // Phase 2: Occurrence
        request.input('occurrence_from_datetime', mssql.DateTime, params.occurrence_from_datetime || null);
        request.input('occurrence_to_datetime', mssql.DateTime, params.occurrence_to_datetime || null);
        request.input('place_of_occurrence', mssql.NVarChar, params.place_of_occurrence || null);
        request.input('incident_address', mssql.NVarChar, params.incident_address || null);
        request.input('beat_number', mssql.NVarChar, params.beat_number || null);

        // Phase 3: Complainant
        request.input('complainant_name', mssql.NVarChar, params.complainant_name);
        request.input('complainant_mobile', mssql.NVarChar, params.complainant_mobile || null);
        request.input('complainant_email', mssql.NVarChar, params.complainant_email || null);
        request.input('complainant_aadhar', mssql.NVarChar, params.complainant_aadhar || null);
        request.input('complainant_pan', mssql.NVarChar, params.complainant_pan || null);
        request.input('complainant_address', mssql.NVarChar, params.complainant_address || null);

        // Victim Details
        request.input('is_victim_same_as_complainant', mssql.Bit, params.is_victim_same_as_complainant ? 1 : 0);
        request.input('victim_name', mssql.NVarChar, params.victim_name || null);
        request.input('victim_mobile', mssql.NVarChar, params.victim_mobile || null);
        request.input('victim_email', mssql.NVarChar, params.victim_email || null);
        request.input('victim_address', mssql.NVarChar, params.victim_address || null);

        // Phase 4: Fraud Details
        request.input('fraud_amount', mssql.Decimal(18, 2), params.fraud_amount ? parseFloat(params.fraud_amount) : null);
        request.input('target_financial_institute', mssql.NVarChar, params.target_financial_institute || null);
        request.input('account_number', mssql.NVarChar, params.account_number || null);
        request.input('fir_narrative', mssql.NVarChar, params.fir_narrative || null);

        // Phase 5: Assignment & System
        request.input('assigned_to', mssql.Int, parseInt(params.assigned_to));
        request.input('sho_name', mssql.NVarChar, params.sho_name || null);
        request.input('created_by', mssql.Int, parseInt(params.created_by));
        request.input('priority_id', mssql.Int, params.priority_id ? parseInt(params.priority_id) : null);
        request.input('status_id', mssql.Int, params.status_id ? parseInt(params.status_id) : 1);
        request.input('document_id', mssql.BigInt, params.document_id || null);

        const result = await request.execute('dbo.sp_RegisterCyberCrimeCase');
        return result.recordset[0];
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
            .input('name', mssql.NVarChar, name || null)
            .input('mobile', mssql.NVarChar, mobile || null)
            .input('email', mssql.NVarChar, email || null)
            .input('address', mssql.NVarChar, address || null)
            .input('bank_name', mssql.NVarChar, bank_name || null)
            .input('account_no', mssql.NVarChar, account_no || null)
            .query('INSERT INTO case_victims (case_id, name, mobile, email, address, bank_name, account_no) VALUES (@case_id, @name, @mobile, @email, @address, @bank_name, @account_no)');
    },

    async updateVictim(transaction, { caseId, name, mobile, email, address, bank_name, account_no }) {
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, name || null)
            .input('mobile', mssql.NVarChar, mobile || null)
            .input('email', mssql.NVarChar, email || null)
            .input('address', mssql.NVarChar, address || null)
            .input('bank_name', mssql.NVarChar, bank_name || null)
            .input('account_no', mssql.NVarChar, account_no || null)
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
    async insertPdfNotice(pool, { caseId, filePath, fileName }) {
        await pool.request()
            .input('case_id', mssql.Int, caseId)
            .input('type', mssql.NVarChar, 'Legal Notice')
            .input('path', mssql.NVarChar, filePath)
            .input('name', mssql.NVarChar, fileName || 'Generated Notice.pdf')
            .query('INSERT INTO fir_documents (case_id, file_type, file_path, file_name) VALUES (@case_id, @type, @path, @name)');
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

    // ── Document Management ───────────────────────────────────────────────────

    async insertDocument(params) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('type_id', mssql.Int, params.document_type_id || 1)
            .input('name', mssql.NVarChar, params.file_name)
            .input('orig_name', mssql.NVarChar, params.original_file_name)
            .input('ext', mssql.NVarChar, params.file_extension)
            .input('mime', mssql.NVarChar, params.mime_type)
            .input('size', mssql.BigInt, params.file_size)
            .input('path', mssql.NVarChar, params.file_path)
            .input('uploaded_by', mssql.Int, params.uploaded_by)
            .query(`INSERT INTO documents 
                (document_type_id, file_name, original_file_name, file_extension, mime_type, file_size, file_path, uploaded_by) 
                OUTPUT INSERTED.document_id 
                VALUES 
                (@type_id, @name, @orig_name, @ext, @mime, @size, @path, @uploaded_by)`);
        return result.recordset[0].document_id;
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
