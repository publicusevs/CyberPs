const { poolPromise, mssql } = require('../config/db');
const fs = require('fs');
const path = require('path');

exports.createCase = async (req, res) => {
    let transaction;
    try {
        const { fir_no, ackn_no, fraud_amount, description, assigned_to, victim_name, victim_mobile, victim_email, victim_address, bank_name, account_no, whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social } = req.body;
        const created_by = req.user.user_id;

        const pool = await poolPromise;
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // 1. Insert into cases
        const caseRequest = new mssql.Request(transaction);
        const caseResult = await caseRequest
            .input('fir_no', mssql.NVarChar, fir_no)
            .input('ackn_no', mssql.NVarChar, ackn_no)
            .input('fraud_amount', mssql.Decimal(18, 2), fraud_amount)
            .input('description', mssql.NVarChar, description)
            .input('assigned_to', mssql.Int, assigned_to)
            .input('created_by', mssql.Int, created_by)
            .input('whatsapp_no', mssql.NVarChar, whatsapp_no)
            .input('gmail_id', mssql.NVarChar, gmail_id)
            .input('facebook_id', mssql.NVarChar, facebook_id)
            .input('twitter_id', mssql.NVarChar, twitter_id)
            .input('linkedin_id', mssql.NVarChar, linkedin_id)
            .input('insta_id', mssql.NVarChar, insta_id)
            .input('telegram_id', mssql.NVarChar, telegram_id)
            .input('website_url', mssql.NVarChar, website_url)
            .input('other_social', mssql.NVarChar, other_social)
            .query('INSERT INTO cases (fir_no, ackn_no, fraud_amount, description, assigned_to, created_by, whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social) OUTPUT INSERTED.case_id VALUES (@fir_no, @ackn_no, @fraud_amount, @description, @assigned_to, @created_by, @whatsapp_no, @gmail_id, @facebook_id, @twitter_id, @linkedin_id, @insta_id, @telegram_id, @website_url, @other_social)');

        const caseId = caseResult.recordset[0].case_id;

        // 1.5. Link to Police Station if user is assigned
        if (req.user.police_station_id) {
            const mappingRequest = new mssql.Request(transaction);
            await mappingRequest
                .input('case_id', mssql.Int, caseId)
                .input('ps_id', mssql.Int, req.user.police_station_id)
                .query('INSERT INTO case_station_mapping (case_id, police_station_id) VALUES (@case_id, @ps_id)');
        }

        // 2. Insert into case_victims
        const victimRequest = new mssql.Request(transaction);
        await victimRequest
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, victim_name)
            .input('mobile', mssql.NVarChar, victim_mobile)
            .input('email', mssql.NVarChar, victim_email)
            .input('address', mssql.NVarChar, victim_address)
            .input('bank_name', mssql.NVarChar, bank_name)
            .input('account_no', mssql.NVarChar, account_no)
            .query('INSERT INTO case_victims (case_id, name, mobile, email, address, bank_name, account_no) VALUES (@case_id, @name, @mobile, @email, @address, @bank_name, @account_no)');

        // 3. FIR Upload if file exists
        if (req.file) {
            const firRequest = new mssql.Request(transaction);
            await firRequest
                .input('case_id', mssql.Int, caseId)
                .input('file_path', mssql.NVarChar, req.file.path)
                .input('file_name', mssql.NVarChar, req.file.originalname)
                .input('file_type', mssql.NVarChar, req.file.mimetype)
                .query('INSERT INTO fir_documents (case_id, file_path, file_name, file_type) VALUES (@case_id, @file_path, @file_name, @file_type)');
        }

        // 4. Insert multiple accused suspects
        let accusedList = [];
        try {
            if (req.body.accusedList) accusedList = JSON.parse(req.body.accusedList);
        } catch (e) {
            console.error('Failed to parse accusedList', e);
        }

        for (const acc of accusedList) {
            const accReq = new mssql.Request(transaction);
            await accReq
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
                .query(`INSERT INTO case_accused (case_id, name, alias, mobile, whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social)
                        VALUES (@case_id, @name, @alias, @mobile, @whatsapp_no, @gmail_id, @facebook_id, @twitter_id, @linkedin_id, @insta_id, @telegram_id, @website_url, @other_social)`);
        }

        await transaction.commit();
        res.json({ success: true, message: 'Case registered successfully', case_id: caseId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to register case', error: err.message });
    }
};

exports.updateFullCase = async (req, res) => {
    let transaction;
    try {
        const caseId = req.params.id;
        const { fir_no, ackn_no, fraud_amount, description, assigned_to, victim_name, victim_mobile, victim_email, victim_address, bank_name, account_no, whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social } = req.body;

        const pool = await poolPromise;
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // 1. Update cases
        const caseRequest = new mssql.Request(transaction);
        await caseRequest
            .input('case_id', mssql.Int, caseId)
            .input('fir_no', mssql.NVarChar, fir_no)
            .input('ackn_no', mssql.NVarChar, ackn_no)
            .input('fraud_amount', mssql.Decimal(18, 2), fraud_amount)
            .input('description', mssql.NVarChar, description)
            .input('assigned_to', mssql.Int, assigned_to)
            .input('whatsapp_no', mssql.NVarChar, whatsapp_no)
            .input('gmail_id', mssql.NVarChar, gmail_id)
            .input('facebook_id', mssql.NVarChar, facebook_id)
            .input('twitter_id', mssql.NVarChar, twitter_id)
            .input('linkedin_id', mssql.NVarChar, linkedin_id)
            .input('insta_id', mssql.NVarChar, insta_id)
            .input('telegram_id', mssql.NVarChar, telegram_id)
            .input('website_url', mssql.NVarChar, website_url)
            .input('other_social', mssql.NVarChar, other_social)
            .query('UPDATE cases SET fir_no=@fir_no, ackn_no=@ackn_no, fraud_amount=@fraud_amount, description=@description, assigned_to=@assigned_to, whatsapp_no=@whatsapp_no, gmail_id=@gmail_id, facebook_id=@facebook_id, twitter_id=@twitter_id, linkedin_id=@linkedin_id, insta_id=@insta_id, telegram_id=@telegram_id, website_url=@website_url, other_social=@other_social WHERE case_id=@case_id');

        // 2. Update case_victims
        const victimRequest = new mssql.Request(transaction);
        await victimRequest
            .input('case_id', mssql.Int, caseId)
            .input('name', mssql.NVarChar, victim_name)
            .input('mobile', mssql.NVarChar, victim_mobile)
            .input('email', mssql.NVarChar, victim_email)
            .input('address', mssql.NVarChar, victim_address)
            .input('bank_name', mssql.NVarChar, bank_name)
            .input('account_no', mssql.NVarChar, account_no)
            .query('UPDATE case_victims SET name=@name, mobile=@mobile, email=@email, address=@address, bank_name=@bank_name, account_no=@account_no WHERE case_id=@case_id');

        // 3. FIR Upload if file exists
        if (req.file) {
            const firRequest = new mssql.Request(transaction);
            await firRequest
                .input('case_id', mssql.Int, caseId)
                .input('file_path', mssql.NVarChar, req.file.path)
                .input('file_name', mssql.NVarChar, req.file.originalname)
                .input('file_type', mssql.NVarChar, req.file.mimetype)
                .query('INSERT INTO fir_documents (case_id, file_path, file_name, file_type) VALUES (@case_id, @file_path, @file_name, @file_type)');
        }

        // 4. Update multiple accused suspects
        const delReq = new mssql.Request(transaction);
        await delReq.input('case_id', mssql.Int, caseId).query('DELETE FROM case_accused WHERE case_id=@case_id');

        let accusedList = [];
        try {
            if (req.body.accusedList) accusedList = JSON.parse(req.body.accusedList);
        } catch (e) {
            console.error('Failed to parse accusedList', e);
        }

        for (const acc of accusedList) {
            const accReq = new mssql.Request(transaction);
            await accReq
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
                .query(`INSERT INTO case_accused (case_id, name, alias, mobile, whatsapp_no, gmail_id, facebook_id, twitter_id, linkedin_id, insta_id, telegram_id, website_url, other_social)
                        VALUES (@case_id, @name, @alias, @mobile, @whatsapp_no, @gmail_id, @facebook_id, @twitter_id, @linkedin_id, @insta_id, @telegram_id, @website_url, @other_social)`);
        }

        await transaction.commit();
        res.json({ success: true, message: 'Case updated successfully', case_id: caseId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update case', error: err.message });
    }
};

exports.getAllCases = async (req, res) => {
    try {
        const { role, police_station_id } = req.user;
        const pool = await poolPromise;
        let query = 'SELECT c.*, u.name as assigned_to_name FROM cases c LEFT JOIN users u ON c.assigned_to = u.user_id';
        
        const request = pool.request();
        // 🛡️ BACKEND SAFE MODE: Admins bypass all station-level filtering
        if (police_station_id && role !== 'Admin') {
            query += ' JOIN case_station_mapping csm ON c.case_id = csm.case_id WHERE csm.police_station_id = @ps_id';
            request.input('ps_id', mssql.Int, police_station_id);
        }
        
        query += ' ORDER BY c.created_at DESC';
        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching cases' });
    }
};

exports.getCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const { police_station_id } = req.user;
        const pool = await poolPromise;
        if (!pool) return res.status(503).json({ success: false, message: 'Database connection unavailable' });

        let query = 'SELECT * FROM cases WHERE case_id = @case_id';
        if (police_station_id) {
            query = `SELECT c.*, ps.station_name, ps.address as station_address, ps.city as station_city 
                     FROM cases c 
                     LEFT JOIN case_station_mapping csm ON c.case_id = csm.case_id 
                     LEFT JOIN police_stations ps ON csm.police_station_id = ps.police_station_id 
                     WHERE c.case_id = @case_id 
                     AND (@ps_id IS NULL OR csm.police_station_id = @ps_id OR csm.police_station_id IS NULL)`;
        }

        const caseReq = pool.request().input('case_id', mssql.Int, id);
        if (police_station_id) {
            caseReq.input('ps_id', mssql.Int, police_station_id);
        }

        const [caseResult, victimResult, firResult, evidenceResult, transactionsResult, notesResult, accusedResult] = await Promise.all([
            caseReq.query(query),
            pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_victims WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM fir_documents WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_evidence WHERE case_id = @case_id ORDER BY uploaded_at DESC'),
            pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_transactions WHERE case_id = @case_id'),
            pool.request().input('case_id', mssql.Int, id).query('SELECT n.*, u.name as author FROM case_notes n JOIN users u ON n.user_id = u.user_id WHERE n.case_id = @case_id ORDER BY n.created_at DESC'),
            pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_accused WHERE case_id = @case_id')
        ]);

        if (caseResult.recordset.length === 0) return res.status(404).json({ message: 'Case not found' });

        res.json({
            success: true,
            case: caseResult.recordset[0],
            victim: victimResult.recordset[0],
            fir: firResult.recordset[0],
            evidence: evidenceResult.recordset,
            transactions: transactionsResult.recordset,
            notes: notesResult.recordset,
            accusedList: accusedResult.recordset
        });
    } catch (err) {
        console.error('[getCaseById Error]', err.message);
        res.status(500).json({ success: false, message: 'Error fetching case details' });
    }
};

exports.updateProfiles = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { victim, accusedList } = req.body;

        const pool = await poolPromise;
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // 1. Update Victim
        if (victim) {
            const vReq = new mssql.Request(transaction);
            await vReq
                .input('case_id', mssql.Int, id)
                .input('name', mssql.NVarChar, victim.name || '')
                .input('mobile', mssql.NVarChar, victim.mobile || '')
                .input('email', mssql.NVarChar, victim.email || '')
                .input('address', mssql.NVarChar, victim.address || '')
                .input('bank_name', mssql.NVarChar, victim.bank_name || '')
                .input('account_no', mssql.NVarChar, victim.account_no || '')
                .query(`UPDATE case_victims SET name=@name, mobile=@mobile, email=@email, address=@address, bank_name=@bank_name, account_no=@account_no WHERE case_id=@case_id`);
        }

        // 2. Update AccusedList
        if (accusedList && Array.isArray(accusedList)) {
            for (const acc of accusedList) {
                if (acc.accused_id) {
                    const accReq = new mssql.Request(transaction);
                    await accReq
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
                        .query(`UPDATE case_accused SET name=@name, alias=@alias, mobile=@mobile, whatsapp_no=@whatsapp_no, gmail_id=@gmail_id, 
                                facebook_id=@facebook_id, twitter_id=@twitter_id, linkedin_id=@linkedin_id, insta_id=@insta_id, telegram_id=@telegram_id, 
                                website_url=@website_url, other_social=@other_social WHERE accused_id=@accused_id`);
                }
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Profiles updated successfully' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ success: false, message: 'Failed to update profiles', error: err.message });
    }
};

exports.addNote = async (req, res) => {
    try {
        const { case_id, note_text } = req.body;
        const user_id = req.user.user_id;
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, case_id)
            .input('user_id', mssql.Int, user_id)
            .input('note_text', mssql.NVarChar, note_text)
            .query('INSERT INTO case_notes (case_id, user_id, note_text) VALUES (@case_id, @user_id, @note_text)');
        res.json({ success: true, message: 'Note added' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding note' });
    }
};

exports.searchCases = async (req, res) => {
    try {
        const { q } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('q', mssql.NVarChar, `%${q}%`)
            .query(`
                SELECT DISTINCT c.*, u.name as assigned_to_name 
                FROM cases c 
                LEFT JOIN users u ON c.assigned_to = u.user_id 
                LEFT JOIN case_victims v ON c.case_id = v.case_id
                WHERE c.fir_no LIKE @q 
                OR c.ackn_no LIKE @q 
                OR v.mobile LIKE @q 
                OR v.account_no LIKE @q
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

exports.updateStatus = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const user_id = req.user.user_id;

        const pool = await poolPromise;

        // Retrieve old status first
        const currentCase = await pool.request()
            .input('case_id', mssql.Int, id)
            .query('SELECT status FROM cases WHERE case_id = @case_id');
        const old_status = currentCase.recordset[0]?.status || 'Active';

        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // Update Case Status
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, id)
            .input('status', mssql.NVarChar, status)
            .query('UPDATE cases SET status = @status WHERE case_id = @case_id');

        // Insert into History
        await new mssql.Request(transaction)
            .input('case_id', mssql.Int, id)
            .input('old_status', mssql.NVarChar, old_status)
            .input('new_status', mssql.NVarChar, status)
            .input('updated_by', mssql.Int, user_id)
            .input('reason', mssql.NVarChar, remarks)
            .query('INSERT INTO case_status_history (case_id, old_status, new_status, updated_by, reason) VALUES (@case_id, @old_status, @new_status, @updated_by, @reason)');

        await transaction.commit();
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Status update failed:', err);
        res.status(500).json({ success: false, message: 'Status update failed' });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { case_id, utr_no, sender_acc, receiver_acc, amount, transaction_date } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, case_id)
            .input('utr_no', mssql.NVarChar, utr_no)
            .input('sender_acc', mssql.NVarChar, sender_acc)
            .input('receiver_acc', mssql.NVarChar, receiver_acc)
            .input('amount', mssql.Decimal(18, 2), amount)
            .input('transaction_date', mssql.DateTime, transaction_date || new Date())
            .query('INSERT INTO case_transactions (case_id, utr_no, sender_acc, receiver_acc, amount, transaction_date) VALUES (@case_id, @utr_no, @sender_acc, @receiver_acc, @amount, @transaction_date)');
        res.json({ success: true, message: 'Transaction added' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to log transaction' });
    }
};

exports.addEvidence = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

        const { case_id, description } = req.body;
        const user_id = req.user.user_id;
        const pool = await poolPromise;

        const evidenceRequests = req.files.map(file => {
            return pool.request()
                .input('case_id', mssql.Int, case_id)
                .input('file_path', mssql.NVarChar, file.path)
                .input('file_name', mssql.NVarChar, file.originalname)
                .input('description', mssql.NVarChar, description)
                .query('INSERT INTO case_evidence (case_id, file_path, file_name, description) VALUES (@case_id, @file_path, @file_name, @description)');
        });

        await Promise.all(evidenceRequests);
        res.json({ success: true, message: 'Evidence uploaded successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Evidence upload failed' });
    }
};

const fs = require('fs');
const path = require('path');

exports.deleteFile = async (req, res) => {
    let transaction;
    try {
        const { type, id } = req.body; // type: 'fir' or 'evidence', id: doc_id or evidence_id
        const pool = await poolPromise;

        let file_path = '';
        let case_id = null;
        let is_forensic_excel = false;

        if (type === 'fir') {
            const result = await pool.request().input('doc_id', mssql.Int, id).query('SELECT file_path, case_id FROM fir_documents WHERE doc_id = @doc_id');
            if (result.recordset.length > 0) {
                file_path = result.recordset[0].file_path;
                case_id = result.recordset[0].case_id;
            }
        } else if (type === 'evidence') {
            const result = await pool.request().input('evidence_id', mssql.Int, id).query('SELECT file_path, case_id, description FROM case_evidence WHERE evidence_id = @evidence_id');
            if (result.recordset.length > 0) {
                file_path = result.recordset[0].file_path;
                case_id = result.recordset[0].case_id;
                is_forensic_excel = result.recordset[0].description === 'Forensic Money Trail Excel Artifact';
            }
        }

        if (!file_path) return res.status(404).json({ success: false, message: 'File record not found' });

        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        if (type === 'fir') {
            await new mssql.Request(transaction).input('doc_id', mssql.Int, id).query('DELETE FROM fir_documents WHERE doc_id = @doc_id');
        } else {
            await new mssql.Request(transaction).input('evidence_id', mssql.Int, id).query('DELETE FROM case_evidence WHERE evidence_id = @evidence_id');

            // If it's a forensic excel, we should also clear the transactions for this case to stay clean
            if (is_forensic_excel && case_id) {
                await new mssql.Request(transaction).input('case_id', mssql.Int, case_id).query('DELETE FROM case_transactions WHERE case_id = @case_id');
            }
        }

        await transaction.commit();

        // Physically delete from folder
        const fullPath = path.resolve(file_path);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        res.json({ success: true, message: 'File deleted successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete file', error: err.message });
    }
};

exports.saveNotice = async (req, res) => {
    try {
        const { case_id, bank_name, pdf_base64 } = req.body;
        if (!pdf_base64) return res.status(400).json({ message: 'No PDF data' });

        const fs = require('fs');
        const path = require('path');

        // Folder structure: uploads/notices/{case_id}/
        const dir = path.join('uploads', 'notices', case_id.toString());
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Filename: {case_id}_{bank_name}_{index}.pdf
        const cleanBankName = bank_name.replace(/\s+/g, '_');
        const existingFiles = fs.readdirSync(dir).filter(f => f.startsWith(`${case_id}_${cleanBankName}_`));
        const index = existingFiles.length + 1;
        
        const fileName = `${case_id}_${cleanBankName}_${index}.pdf`;
        const filePath = path.join(dir, fileName);

        const base64Data = pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        fs.writeFileSync(filePath, base64Data, 'base64');

        const pool = await poolPromise;
        await pool.request()
            .input('case_id', mssql.Int, case_id)
            .input('type', mssql.NVarChar, 'Legal Notice')
            .input('path', mssql.NVarChar, filePath)
            .input('file_name', mssql.NVarChar, fileName)
            .query('INSERT INTO fir_documents (case_id, document_type, file_path, file_name) VALUES (@case_id, @type, @path, @file_name)');

        res.json({ success: true, message: 'Notice saved to dossier', filePath, fileName });
    } catch (err) {
        console.error('Save notice error:', err);
        res.status(500).json({ success: false, message: 'Failed to save notice' });
    }
};

exports.getNodalRecipients = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] Fetching recipients for case: ${id}`);

        // 1. Read bank emails list
        const rootPath = path.resolve(__dirname, '..', '..', '..');
        const bankListPath = path.join(rootPath, 'bankmaillist.json');
        
        let bankEmails = [];
        if (fs.existsSync(bankListPath)) {
            try {
                bankEmails = JSON.parse(fs.readFileSync(bankListPath, 'utf8'));
            } catch (pErr) {
                console.error('[ERROR] bankmaillist.json parsing failed:', pErr.message);
            }
        }

        // 2. Scan case directory for notices
        const dir = path.join(process.cwd(), 'uploads', 'notices', id.toString());
        if (!fs.existsSync(dir)) {
            return res.json({ success: true, data: [] });
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
        
        // Group by bank
        const bankFiles = {};
        files.forEach(f => {
            const parts = f.split('_');
            if (parts.length >= 3) {
                // Remove ID and Index, join the rest as bank name
                const bankName = parts.slice(1, -1).join(' ').replace(/_/g, ' ').trim();
                if (!bankFiles[bankName]) bankFiles[bankName] = [];
                bankFiles[bankName].push(f);
            }
        });

        // 3. Match with emails (Case-insensitive & space-flexible)
        const recipients = Object.keys(bankFiles).map(bankName => {
            const normalizedBankName = bankName.toLowerCase().replace(/\s+/g, '');
            const match = bankEmails.find(b => 
                b.bankname.toLowerCase().replace(/\s+/g, '') === normalizedBankName
            );

            return {
                bankname: bankName,
                email: match ? match.bankmail : '',
                files: bankFiles[bankName],
                folderPath: path.resolve(dir)
            };
        });

        res.json({ success: true, data: recipients });
    } catch (err) {
        console.error('[ERROR] Get recipients failed:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
    }
};

exports.sendNodalEmails = async (req, res) => {
    try {
        const { recipients, subject, body } = req.body;
        const results = [];
        const path = require('path');

        for (const recipient of recipients) {
            try {
                // Construct absolute paths for ramail
                const attachments = recipient.files.map(f => path.join(recipient.folderPath, f));
                
                const payload = {
                    recipients: [recipient.email],
                    subject: subject.replace('{{bankName}}', recipient.bankname),
                    body: body.replace('{{bankName}}', recipient.bankname),
                    attachments: attachments,
                    use_queue: false
                };

                const response = await fetch('http://localhost:8000/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                results.push({ bankname: recipient.bankname, success: response.ok, response: data });
            } catch (err) {
                console.error(`Failed to send email to ${recipient.bankname}:`, err.message);
                results.push({ bankname: recipient.bankname, success: false, error: err.message });
            }
        }

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Send nodal emails error:', err);
        res.status(500).json({ success: false, message: 'Batch mailing failed' });
    }
};
