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

const CasesService = {

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

    async getCaseById(id, policeStationId) {
        const pool = await poolPromise;
        if (!pool) throw new AppError('Database connection unavailable', 503);

        const result = await CasesRepository.getById(id, policeStationId);
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

            if (accusedList && Array.isArray(accusedList)) {
                for (const acc of accusedList) {
                    if (acc.accused_id) {
                        await CasesRepository.updateAccused(transaction, acc);
                    }
                }
            }

            await transaction.commit();

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
    async savePdfNotice({ case_id, bank_name, pdf_base64 }) {
        if (!pdf_base64) throw new AppError('No PDF data provided', 400);

        const dir = path.join('uploads', 'notices');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const fileName = `NOTICE_${bank_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(dir, fileName);

        const base64Data = pdf_base64.replace(/^data:application\/pdf;base64,/, '');
        fs.writeFileSync(filePath, base64Data, 'base64');

        const pool = await poolPromise;
        await CasesRepository.insertPdfNotice(pool, { caseId: case_id, filePath });

        return filePath;
    },
};

module.exports = CasesService;
