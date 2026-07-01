/**
 * cases.service.js — Business logic orchestration for the Cases domain.
 *
 * Handles multi-step transactional operations:
 *  - createCase: inserts case + victim + accused + station mapping + optional FIR file
 *  - updateFullCase: updates case + victim + replaces accused list
 *  - updateProfiles: updates victim + individual accused records
 *  - updateStatus: updates status + inserts history record
 *  - addEvidence, deleteFile, saveNotice (PDF), etc.
 *
 * Controllers call this service — never the repository directly.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { poolPromise, mssql } = require('../../config/db');
const CasesRepository = require('./cases.repository');
const AppError = require('../../core/AppError');
const logger = require('../../utils/logger');

const { sendMail } = require('../../config/mail');

const CasesService = {

    /**
     * Enterprise Master Case Registration
     * Orchestrates: File Upload -> Document ID -> Stored Procedure Execution -> Accused Mapping
     */
    async registerCyberCrimeCase(data, user, file) {
        let document_id = null;
        if (file) {
            try {
                document_id = await CasesRepository.insertDocument({
                    document_type_id: 1,
                    file_name: file.filename,
                    original_file_name: file.originalname,
                    file_extension: path.extname(file.originalname),
                    mime_type: file.mimetype,
                    file_size: file.size,
                    file_path: `/uploads/fir/${file.filename}`,
                    uploaded_by: user.user_id
                });
            } catch (docErr) {
                // Document insert failing should not block case registration
                logger.warn('[CASES] Document insert failed, proceeding without document_id:', docErr.message);
            }
        }

        const combineDateTime = (dateStr, timeStr) => {
            if (!dateStr) return null;
            const clean = dateStr.trim();
            if (!timeStr) return new Date(clean);
            return new Date(`${clean}T${timeStr.trim()}`);
        };

        const toInt = (v) => {
            const n = parseInt(v, 10);
            return isNaN(n) ? null : n;
        };

        const params = {
            fir_no:                   data.fir_no,
            ackn_no:                  data.ackn_no || null,
            fir_year:                 toInt(data.fir_year),
            district_id:              toInt(data.district_id || data.district),
            police_station_id:        toInt(data.police_station_id || data.police_station),
            fir_datetime:             combineDateTime(data.fir_date, data.fir_time),
            info_received_datetime:   combineDateTime(data.info_received_date, data.info_received_time),
            gd_entry_no:              data.gd_no || data.gd_entry_no || null,

            occurrence_from_datetime: combineDateTime(data.occurrence_date_from, data.occurrence_time_from),
            occurrence_to_datetime:   combineDateTime(data.occurrence_date_to, data.occurrence_time_to),
            place_of_occurrence:      data.place_of_occurrence || data.place_of_incident || null,
            incident_address:         data.incident_address || null,
            beat_number:              data.beat_number || null,

            complainant_name:         data.complainant_name,
            complainant_mobile:       data.complainant_mobile || null,
            complainant_email:        data.complainant_email || null,
            complainant_aadhar:       data.complainant_aadhaar || data.complainant_aadhar || null,
            complainant_pan:          data.complainant_pan || null,
            complainant_address:      data.complainant_address || null,

            is_victim_same_as_complainant: data.is_victim_same === 'true' || data.is_victim_same === true,
            victim_name:              data.victim_name || null,
            victim_mobile:            data.victim_mobile || null,
            victim_email:             data.victim_email || null,
            victim_address:           data.victim_address || null,

            fraud_amount:             data.fraud_amount || null,
            target_financial_institute: data.bank_name || data.target_financial_institute || null,
            account_number:           data.account_no || data.account_number || null,
            fir_narrative:            data.description || data.fir_narrative || null,

            assigned_to:              toInt(data.assigned_to),
            sho_name:                 data.sho_details || data.sho_name || null,
            created_by:               toInt(user.user_id),
            priority_id:              toInt(data.priority_id) || null,
            status_id:                toInt(data.status_id) || 1,
            document_id:              document_id || null,
        };

        logger.info('[CASES] SP Params:', JSON.stringify({
            fir_no: params.fir_no,
            district_id: params.district_id,
            police_station_id: params.police_station_id,
            assigned_to: params.assigned_to,
            created_by: params.created_by,
            fir_datetime: params.fir_datetime,
        }));

        const result = await CasesRepository.registerCyberCrimeCase(params);

        logger.info('[CASES] SP Result:', JSON.stringify(result));

        if (!result) {
            throw new AppError('Stored procedure returned no result', 500);
        }

        if (result.success === 0) {
            const errMsg = result.error_message || result.message || 'SP execution failed';
            logger.error(`[CASES] SP Error (line ${result.error_line}, #${result.error_number}): ${errMsg}`);
            throw new AppError(errMsg, 400);
        }

        if (result.case_id) {
            try {
                await CasesRepository.updateShoAndRemarks(null, result.case_id, params.sho_name, data.remarks);
            } catch (shoRemarksErr) {
                logger.warn('[CASES] Failed to save sho_name/remarks during SP registration:', shoRemarksErr.message);
            }
        }

        // Handle Accused List
        if (data.accusedList) {
            let accusedList = [];
            try {
                accusedList = typeof data.accusedList === 'string' ? JSON.parse(data.accusedList) : data.accusedList;
            } catch (e) {
                logger.warn('[CASES] Failed to parse accusedList:', e.message);
            }
            for (const acc of accusedList) {
                if (acc.name || acc.mobile || acc.whatsapp_no) {
                    try {
                        await CasesRepository.insertAccused(null, result.case_id, acc);
                    } catch (accErr) {
                        logger.warn('[CASES] Accused insert failed:', accErr.message);
                    }
                }
            }
        }

        return result;
    },

    async createCase(data, user) {
        const pool = await poolPromise;
        if (!pool) throw new AppError('Database connection unavailable', 503);

        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Insert Case
            const caseId = await CasesRepository.insertCase(transaction, {
                ...data,
                created_by: user.user_id,
            });

            // 2. Map to Police Station
            if (user.police_station_id) {
                await CasesRepository.insertStationMapping(transaction, {
                    caseId,
                    policeStationId: user.police_station_id,
                });
            }

            // 3. Insert Victim
            await CasesRepository.insertVictim(transaction, {
                caseId,
                name: data.victim_name,
                mobile: data.victim_mobile,
                email: data.victim_email,
                address: data.victim_address,
                bank_name: data.bank_name,
                account_no: data.account_no,
            });

            // 4. Insert FIR document if uploaded
            if (data.file) {
                await CasesRepository.insertFirDocument(transaction, {
                    caseId,
                    filePath: data.file.path,
                    fileName: data.file.originalname,
                    fileType: data.file.mimetype,
                });
            }

            // 5. Insert Accused list
            let accusedList = [];
            try {
                if (data.accusedList) accusedList = JSON.parse(data.accusedList);
            } catch (e) {
                logger.warn('[CASES] Failed to parse accusedList', e);
            }
            for (const acc of accusedList) {
                await CasesRepository.insertAccused(transaction, caseId, acc);
            }

            await transaction.commit();
            return { case_id: caseId };

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    async updateFullCase(caseId, data, file) {
        const pool = await poolPromise;
        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            await CasesRepository.updateCase(transaction, caseId, data);
            await CasesRepository.updateComplainant(transaction, {
                caseId,
                name: data.complainant_name,
                mobile: data.complainant_mobile,
                email: data.complainant_email,
                aadhar_no: data.complainant_aadhaar || data.complainant_aadhar,
                pan_no: data.complainant_pan,
                address: data.complainant_address,
            });
            await CasesRepository.updateVictim(transaction, {
                caseId,
                name: data.victim_name,
                mobile: data.victim_mobile,
                email: data.victim_email,
                address: data.victim_address,
                bank_name: data.bank_name,
                account_no: data.account_no,
            });

            if (file) {
                await CasesRepository.insertFirDocument(transaction, {
                    caseId,
                    filePath: file.path,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                });
            }

            // Replace accused: delete all then re-insert
            await CasesRepository.deleteAccusedByCase(transaction, caseId);
            let accusedList = [];
            try {
                if (data.accusedList) accusedList = JSON.parse(data.accusedList);
            } catch (e) {
                logger.warn('[CASES] Failed to parse accusedList', e);
            }
            for (const acc of accusedList) {
                await CasesRepository.insertAccused(transaction, caseId, acc);
            }

            await transaction.commit();
            return { case_id: caseId };

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    async getAllCases({ role, police_station_id }) {
        return CasesRepository.getAll({
            policeStationId: police_station_id,
            isAdmin: role === 'Admin',
        });
    },

    async getCaseById(id, policeStationId, isAdmin) {
        const pool = await poolPromise;
        if (!pool) throw new AppError('Database connection unavailable', 503);

        const result = await CasesRepository.getById(id, isAdmin ? null : policeStationId);
        if (!result) throw new AppError('Case not found', 404);
        return result;
    },

    async updateProfiles(id, { victim, accusedList }) {
        const pool = await poolPromise;
        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            if (victim) {
                await CasesRepository.updateVictim(transaction, {
                    caseId: id,
                    name: victim.name || '',
                    mobile: victim.mobile || '',
                    email: victim.email || '',
                    address: victim.address || '',
                    bank_name: victim.bank_name || '',
                    account_no: victim.account_no || '',
                });
            }

            const updatedList = [];
            if (accusedList && Array.isArray(accusedList)) {
                // Query existing accused for the case
                const existingReq = new mssql.Request(transaction);
                const existingRes = await existingReq
                    .input('case_id', mssql.Int, id)
                    .query('SELECT accused_id FROM case_accused WHERE case_id = @case_id');
                const existingRecords = existingRes.recordset;

                for (let i = 0; i < accusedList.length; i++) {
                    const acc = accusedList[i];
                    if (acc.accused_id) {
                        await CasesRepository.updateAccused(transaction, acc);
                        updatedList.push(acc);
                    } else if (existingRecords[i]) {
                        const accWithId = { ...acc, accused_id: existingRecords[i].accused_id };
                        await CasesRepository.updateAccused(transaction, accWithId);
                        updatedList.push(accWithId);
                    } else {
                        const req = new mssql.Request(transaction);
                        const insertRes = await req
                            .input('case_id', mssql.Int, id)
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
                                OUTPUT INSERTED.accused_id
                                VALUES 
                                (@case_id, @name, @alias, @mobile, @whatsapp_no, @gmail_id, @facebook_id,
                                 @twitter_id, @linkedin_id, @insta_id, @telegram_id, @website_url, @other_social)`);
                        const newId = insertRes.recordset[0].accused_id;
                        updatedList.push({ ...acc, accused_id: newId });
                    }
                }
            }

            await transaction.commit();
            return updatedList;

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    async addNote({ case_id, note_text, user_id }) {
        await CasesRepository.insertNote({ caseId: case_id, userId: user_id, noteText: note_text });
    },

    async searchCases(q) {
        return CasesRepository.search(q);
    },

    async updateStatus(id, { status, remarks }, userId) {
        const pool = await poolPromise;
        const oldStatus = await CasesRepository.getStatus(id);

        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            await CasesRepository.updateStatus(transaction, id, status);
            await CasesRepository.insertStatusHistory(transaction, {
                caseId: id,
                oldStatus,
                newStatus: status,
                updatedBy: userId,
                reason: remarks,
            });
            await transaction.commit();

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    async addEvidence(files, { case_id, description }) {
        if (!files || files.length === 0) throw new AppError('No files uploaded', 400);
        const pool = await poolPromise;

        await Promise.all(files.map((file) =>
            CasesRepository.insertEvidence(pool, {
                caseId: case_id,
                filePath: file.path,
                fileName: file.originalname,
                description,
            })
        ));
    },

    async deleteFile({ type, id }) {
        const pool = await poolPromise;

        let fileRecord = null;
        if (type === 'fir') {
            fileRecord = await CasesRepository.getFirDocumentById(id);
        } else if (type === 'evidence') {
            fileRecord = await CasesRepository.getEvidenceById(id);
        }

        if (!fileRecord) throw new AppError('File record not found', 404);

        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            if (type === 'fir') {
                await CasesRepository.deleteFirDocument(transaction, id);
            } else {
                await CasesRepository.deleteEvidence(transaction, id);

                // If this is a forensic Excel artifact, also clear its transactions
                if (fileRecord.description === 'Forensic Money Trail Excel Artifact' && fileRecord.case_id) {
                    await CasesRepository.deleteTransactionsByCase(transaction, fileRecord.case_id);
                }
            }

            await transaction.commit();

            // Physically delete from disk
            const fullPath = path.resolve(fileRecord.file_path);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    /**
     * savePdfNotice — saves a base64-encoded PDF as a FIR document artifact.
     * (This was 'saveNotice' in the old caseController — renamed to avoid
     *  confusion with noticeController's saveNotice which uses legal_notices.)
     */
    async saveNotice({ case_id, bank_name, pdf_base64, version_mode = 'none', notice_category = 'Others' }) {
        // Sanitize category name
        const safeCategory = notice_category.replace(/[^a-z0-9]/gi, '_');
        
        // Structure: uploads/notices/{case_id}/{notice_category}/
        const isPkg = typeof process.pkg !== 'undefined';
        const baseUploadsDir = isPkg
            ? path.join(path.dirname(process.execPath), '..', 'uploads')
            : path.join(__dirname, '../../../uploads');
        const dir = path.join(baseUploadsDir, 'notices', String(case_id), safeCategory);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Clean bank name for filename
        const safeBankName = bank_name.replace(/[^a-z0-9]/gi, '_');
        
        // Find ALL existing versions for this bank
        const existingFiles = fs.readdirSync(dir).filter(f => 
            f.toLowerCase().includes(safeBankName.toLowerCase()) && f.endsWith('.pdf')
        );

        if (version_mode === 'none' && existingFiles.length > 0) {
            return { 
                success: false, 
                conflict: true, 
                existingFiles: existingFiles,
                suggestedNext: `${case_id}_${safeBankName}_${existingFiles.length + 1}.pdf`
            };
        }

        let fileName = `${case_id}_${safeBankName}.pdf`;
        if (version_mode === 'increment') {
            // If we are incrementing, we look for the next available slot
            let counter = 1;
            while (fs.existsSync(path.join(dir, `${case_id}_${safeBankName}_${counter}.pdf`))) {
                counter++;
            }
            fileName = `${case_id}_${safeBankName}_${counter}.pdf`;
        }
        
        let filePath = path.join(dir, fileName);

        const base64Data = pdf_base64.replace(/^data:application\/pdf;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const pool = await poolPromise;
        await CasesRepository.insertPdfNotice(pool, { 
            caseId: case_id, 
            filePath: `/uploads/notices/${case_id}/${safeCategory}/${fileName}`, 
            fileName: fileName 
        });

        return { success: true, fileName, categoryPath: safeCategory };
    },

    async getNodalRecipients(caseId, categoryName = '') {
        const isPkg = typeof process.pkg !== 'undefined';
        
        // 1. Read bank emails list
        const bankListPath = isPkg
            ? path.join(path.dirname(process.execPath), '..', 'bankmaillist.json')
            : path.join(__dirname, '..', '..', '..', '..', 'bankmaillist.json');
        
        let bankEmails = [];
        if (fs.existsSync(bankListPath)) {
            try {
                bankEmails = JSON.parse(fs.readFileSync(bankListPath, 'utf8'));
            } catch (err) {
                logger.error('[CASES] bankmaillist.json parse error', err);
            }
        }

        // 2. Scan case category directory with smart fallback
        const safeCategory = categoryName ? categoryName.replace(/[^a-z0-9]/gi, '_') : '';
        const baseUploadsDir = isPkg
            ? path.join(path.dirname(process.execPath), '..', 'uploads')
            : path.join(__dirname, '../../../uploads');
            
        let dir = path.join(baseUploadsDir, 'notices', caseId.toString(), safeCategory);
        
        if (!fs.existsSync(dir) || fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).length === 0) {
            // Fallback 1: Check 'Others' directory
            const othersDir = path.join(baseUploadsDir, 'notices', caseId.toString(), 'Others');
            if (fs.existsSync(othersDir) && fs.readdirSync(othersDir).filter(f => f.endsWith('.pdf')).length > 0) {
                dir = othersDir;
            } else {
                // Fallback 2: Check root case directory
                const rootDir = path.join(baseUploadsDir, 'notices', caseId.toString());
                if (fs.existsSync(rootDir) && fs.readdirSync(rootDir).filter(f => f.endsWith('.pdf')).length > 0) {
                    dir = rootDir;
                } else {
                    return [];
                }
            }
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
        const bankFiles = {};
        
        files.forEach(f => {
            // Pattern: {caseId}_{bankName}(_{version})?.pdf
            const parts = f.replace('.pdf', '').split('_');
            if (parts.length >= 2) {
                let bankNameParts = [];
                if (parts.length > 2 && /^\d+$/.test(parts[parts.length - 1])) {
                    bankNameParts = parts.slice(1, -1);
                } else {
                    bankNameParts = parts.slice(1);
                }
                const bankName = bankNameParts.join(' ').trim();
                if (!bankFiles[bankName]) bankFiles[bankName] = [];
                bankFiles[bankName].push(f);
            }
        });

        // 3. Match with emails and select the most recent file
        return Object.keys(bankFiles).map(bankName => {
            const norm = bankName.toLowerCase().replace(/\s+/g, '');
            const match = bankEmails.find(b => {
                const bName = (b.bank_name || b.bankname || '').toLowerCase().replace(/\s+/g, '');
                return bName === norm;
            });

            // Sort by version descending and take only the latest file
            const sortedFiles = bankFiles[bankName].sort((a, b) => {
                const getVersion = (f) => {
                    const parts = f.replace('.pdf', '').split('_');
                    if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
                        return parseInt(parts[parts.length - 1], 10);
                    }
                    return 0;
                };
                return getVersion(b) - getVersion(a);
            });

            return {
                bankname: bankName,
                email: match ? match.bankmail : '',
                files: [sortedFiles[0]], // Only attach the single most recent file
                folderPath: path.resolve(dir),
                caseId: caseId
            };
        });
    },

    async sendNodalEmails({ recipients, subject, body }) {
        // OPTIMIZATION: Send all emails CONCURRENTLY using Promise.all
        // This reduces total time from N*T to ~T (single email send time)
        const sendSingle = async (recipient) => {
            try {
                if (!recipient.email) {
                    throw new Error('No email address found for this entity');
                }

                const formattedBody = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                        <h3 style="color: #c75a57; border-bottom: 2px solid #c75a57; padding-bottom: 10px;">OFFICIAL INVESTIGATION NOTICE</h3>
                        <p>Respected Nodal Officer,</p>
                        <p>Please find attached the legal notice under <b>Section 94/106 BNSS 2023</b> regarding investigative proceedings for <b>Case ID: ${recipient.caseId || recipient.folderPath.split(path.sep).pop()}</b>.</p>
                        <p>You are requested to take immediate action as per the instructions in the attached document and provide the required information at the earliest.</p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
                            <small><b>Entity Name:</b> ${recipient.bankname}</small><br/>
                            <small><b>Subject:</b> ${subject.replace('{{bankName}}', recipient.bankname)}</small>
                        </div>
                        <p>Regards,<br/><b>Investigation Officer</b><br/>Cyber Crime Police Station, Jaipur</p>
                    </div>
                `;

                const caseIdVal = String(recipient.caseId || recipient.folderPath.split(path.sep).pop());
                const payload = {
                    recipients: [recipient.email],
                    subject_template: subject,
                    body_template: formattedBody,
                    variables: {
                        bankName: recipient.bankname,
                        caseId: caseIdVal
                    },
                    attachments: recipient.files.map(f => path.resolve(recipient.folderPath, f)),
                    is_draft: false
                };

                const response = await fetch('http://localhost:8000/api/v2/mail/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Enterprise API Failed (${response.status}): ${text}`);
                }

                const data = await response.json();
                return { bankname: recipient.bankname, email: recipient.email, success: true, messageId: data.timeline_event || 'dispatched' };
            } catch (err) {
                logger.error(`[CASES] Enterprise Mail Dispatch Failed for ${recipient.bankname}`, err);
                return { bankname: recipient.bankname, success: false, error: err.message };
            }
        };

        // Fire all sends in parallel, collect results
        const results = await Promise.all(recipients.map(sendSingle));
        return results;
    }

};

module.exports = CasesService;
