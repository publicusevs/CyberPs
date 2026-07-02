/**
 * transactions.service.js — Business logic for transaction import and analysis.
 *
 * Handles: Excel parsing, smart column detection, bulk DB insertion,
 * fund flow extraction. Delegates all SQL to TransactionsRepository.
 */

'use strict';

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const TransactionsRepository = require('./transactions.repository');
const { FundFlowService } = require('../../services/FundFlowService');
const AppError = require('../../core/AppError');
const logger = require('../../utils/logger');
const { getUploadsDir } = require('../../utils/appPaths');

// Smart column aliases for account numbers across different bank Excel formats
const ACCOUNT_COLS = [
    'Account No', 'Account No.', 'Account Number', 'Account No./ (Wallet /PG/PA) Id',
    'Account No./ (Wallet/PG/PA) Id', 'Account No./(Wallet /PG/PA) Id',
    'Account No./(Wallet/PG/PA) Id', 'Wallet ID', 'Target Account', 'Beneficiary Account',
    'Dest Account', 'ACCOUNT NO', 'Account No./ (Wallet /PG/PA)  Id',
    'Payee Account', 'Credit Account', 'receiver_account', 'account_number_2',
];

const SENDER_COLS = [
    'Account', 'Sender Account', 'Source Account', 'From Account', 'Sender Acc', 'From Acc',
    'Debit Account', 'Sender Account No', 'sender_account', 'SENDER ACCOUNT',
    'SENDER ACC', 'Payer Account', 'Payer Acc', 'account_number',
];

const UTR_COLS = [
    'Transaction Id / UTR Number', 'Transaction ID / UTR Number',
    'Transaction Id / UTR Number2', 'Transaction ID / UTR Number2',
    'UTR', 'Transaction Id', 'Transaction ID', 'Ref No', 'Reference No',
    'UTR No', 'TRANSACTION ID', 'UTR NUMBER',
];

const AMOUNT_COLS = ['Transaction Amount', 'Disputed Amount', 'Amount Rs.', 'Amount', 'TRANSACTION AMOUNT'];
const DATE_COLS = ['Transaction Date', 'Date', 'TRANSACTION DATE', 'Date of Action'];
const BANK_COLS = ['Bank/FIs', 'Bank/Bc', 'Bank/ Bc', 'Bank Name', 'Bank / FIs', 'Target Bank', 'Beneficiary Bank', 'Bank', 'BANK NAME'];
const LAYER_COLS = ['Layer', 'layer', 'LAYER', 'Layer No', 'Layer Number'];

const getCol = (row, cols) => {
    for (const c of cols) { if (row[c] !== undefined) return row[c]; }
    return undefined;
};

const TransactionsService = {

    async addTransaction({ case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform }) {
        await TransactionsRepository.insertOne({
            case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform,
        });
    },

    async importExcel(file, caseId) {
        if (!file) throw new AppError('No file uploaded', 400);
        if (!caseId) throw new AppError('case_id is required', 400);

        // ── Auto-Migration: ensure layer & ifsc_code columns exist ──────────
        try {
            const pool = await TransactionsRepository.getPool();
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('case_transactions') AND name = 'layer')
                    ALTER TABLE case_transactions ADD layer NVARCHAR(20) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('case_transactions') AND name = 'ifsc_code')
                    ALTER TABLE case_transactions ADD ifsc_code NVARCHAR(20) NULL;
            `);
            logger.info('[EXCEL] Auto-migration: layer & ifsc_code columns ensured');
        } catch (migErr) {
            logger.warn('[EXCEL] Auto-migration skipped:', migErr.message);
        }
        // ─────────────────────────────────────────────────────────────────────

        // 1. Setup target directory — use appPaths to get a real writable path
        // (relative paths crash in pkg portable builds due to read-only virtual fs)
        const caseExcelDir = getUploadsDir('excels', caseId.toString());

        const targetPath = path.join(caseExcelDir, file.filename);
        const dbFilePath = `/uploads/excels/${caseId}/${file.filename}`;

        // 2. Parse workbook — use buffer to avoid file lock issues on Windows
        const fileBuffer = fs.readFileSync(file.path);
        const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });

        // Smart sheet detection: preferred names first, then pick sheet with most data
        const preferredNames = ['money transfer to', 'sheet1', 'transactions', 'data', 'report'];
        let sheetName = workbook.SheetNames[0];
        // Try preferred name match
        for (const target of preferredNames) {
            const found = workbook.SheetNames.find((s) => s.trim().toLowerCase() === target.toLowerCase());
            if (found) { sheetName = found; break; }
        }
        // If still default (first sheet), pick sheet with most rows
        if (sheetName === workbook.SheetNames[0] && workbook.SheetNames.length > 1) {
            let maxRows = 0;
            for (const sn of workbook.SheetNames) {
                const ref = workbook.Sheets[sn]['!ref'];
                if (ref) {
                    const range = xlsx.utils.decode_range(ref);
                    if (range.e.r > maxRows) { maxRows = range.e.r; sheetName = sn; }
                }
            }
        }
        logger.info(`[EXCEL] Sheets: [${workbook.SheetNames.join(', ')}] → Using: "${sheetName}"`);

        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        if (rawData.length === 0) throw new AppError(`Excel sheet "${sheetName}" is empty. Available sheets: ${workbook.SheetNames.join(', ')}`, 400);
        logger.info(`[EXCEL] Headers: ${Object.keys(rawData[0]).join(', ')}`);

        const pool = await TransactionsRepository.getPool();
        if (!pool) throw new AppError('Database not connected', 503);

        // 3. Evidence link (non-fatal)
        try {
            await TransactionsRepository.insertExcelEvidence(pool, {
                caseId, filePath: dbFilePath, fileName: file.originalname,
            });
        } catch (evErr) {
            logger.warn('[EXCEL] Evidence insert skipped:', evErr.message);
        }

        // 4. Clear old transactions for this case (DISABLED to support multi-upload)
        // try {
        //     await TransactionsRepository.deleteByCase(caseId);
        // } catch (delErr) {
        //     logger.warn('[EXCEL] Clear old transactions failed:', delErr.message);
        // }

        // 5. Parse rows — with Layer-aware sender inference
        const bankGroups = {};
        const parsedRows = [];
        let skippedRows = 0;
        const lastAccAtLayer = {}; // layerNum -> last receiver_acc seen at that layer

        for (const row of rawData) {
            try {
                const receiver_acc = getCol(row, ACCOUNT_COLS);
                const utr_no = getCol(row, UTR_COLS);

                if (!receiver_acc && !utr_no) { skippedRows++; continue; }

                const finalReceiverAcc = (receiver_acc || 'N/A').toString().trim().substring(0, 50);
                const finalUtrNo = (utr_no || 'N/A').toString().trim().substring(0, 100);

                // ── Layer detection ──────────────────────────────────────────
                let layerRaw = getCol(row, LAYER_COLS);
                let numericLayer = null;
                if (layerRaw !== undefined && layerRaw !== null && layerRaw !== '') {
                    const match = layerRaw.toString().trim().match(/\d+/);
                    if (match) numericLayer = parseInt(match[0], 10);
                }

                // ── Sender account inference ─────────────────────────────────
                let sender_acc = getCol(row, SENDER_COLS);
                if (sender_acc) {
                    sender_acc = sender_acc.toString().trim().substring(0, 50);
                } else if (numericLayer !== null) {
                    // Layer-based: infer sender from previous layer
                    if (numericLayer === 1) {
                        sender_acc = 'Case Root';
                    } else if (lastAccAtLayer[numericLayer - 1]) {
                        sender_acc = lastAccAtLayer[numericLayer - 1];
                    } else {
                        sender_acc = 'Case Root';
                    }
                } else {
                    sender_acc = 'Case Root';
                }

                // Update layer tracking
                if (numericLayer !== null) {
                    lastAccAtLayer[numericLayer] = finalReceiverAcc;
                }

                // ── Amount ───────────────────────────────────────────────────
                let rawAmount = getCol(row, AMOUNT_COLS) || 0;
                const amount = typeof rawAmount === 'string'
                    ? parseFloat(rawAmount.replace(/,/g, '').trim())
                    : parseFloat(rawAmount);

                // ── Date ─────────────────────────────────────────────────────
                let rawDate = getCol(row, DATE_COLS);
                let trans_date;
                if (!rawDate || rawDate === '') {
                    trans_date = new Date();
                } else if (rawDate instanceof Date) {
                    trans_date = rawDate; // xlsx cellDates:true returns real Date objects
                } else if (typeof rawDate === 'number') {
                    trans_date = new Date((rawDate - 25569) * 86400 * 1000);
                } else {
                    trans_date = new Date(rawDate);
                }
                if (isNaN(trans_date.getTime())) trans_date = new Date();

                // ── Bank ─────────────────────────────────────────────────────
                let rawBank = getCol(row, BANK_COLS) || 'Unknown Bank';
                let bankName = (rawBank ? rawBank.toString() : 'Unknown Bank')
                    .replace(/<[^>]*>/g, ' ').replace(/Reassign Back To/gi, '').replace(/Back To/gi, '')
                    .trim().split(' ').filter((w) => w.length > 0).join(' ') || 'Unknown Bank';

                const layer = numericLayer ? `Layer ${numericLayer}` : (row['Layer'] || row['layer'] || 'Layer 1');
                const ifsc = row['Ifsc Code'] || row['IFSC Code'] || row['IFSC'] || 'N/A';

                parsedRows.push({
                    case_id: parseInt(caseId),
                    sender_acc,
                    receiver_acc: finalReceiverAcc,
                    amount: isNaN(amount) ? 0 : amount,
                    utr_no: finalUtrNo,
                    trans_date,
                    platform: bankName.substring(0, 50),
                    layer: layer || null,
                    ifsc_code: ifsc !== 'N/A' ? ifsc.toString().trim().substring(0, 20) : null,
                    source_file: file.originalname ? file.originalname.substring(0, 255) : 'Unknown Source',
                });

                if (!bankGroups[bankName]) bankGroups[bankName] = { name: bankName, records: [] };
                bankGroups[bankName].records.push({
                    account: finalReceiverAcc,
                    utr: finalUtrNo,
                    layer: layer.toString(),
                    ifsc: ifsc.toString(),
                    amount,
                });
            } catch (rowErr) {
                logger.warn('[EXCEL] Row skip:', rowErr.message);
                skippedRows++;
            }
        }

        logger.debug(`[EXCEL] Parsed: ${parsedRows.length} valid, ${skippedRows} skipped`);
        if (parsedRows.length === 0) {
            throw new AppError(
                `No valid rows found. Skipped: ${skippedRows}. Headers: ${Object.keys(rawData[0]).join(', ')}`,
                400
            );
        }

        // 6. Bulk insert
        const { method, count } = await TransactionsRepository.bulkInsert(parsedRows);
        logger.info(`[EXCEL] Inserted ${count} rows via ${method}`);

        // 7. Move file to final location
        try {
            fs.copyFileSync(file.path, targetPath);
            fs.unlinkSync(file.path);
        } catch (copyErr) {
            logger.warn('[EXCEL] File move warning:', copyErr.message);
        }

        return {
            message: `Imported ${count} transactions (${method})`,
            stats: { totalBanks: Object.keys(bankGroups).length, totalRecords: count, status: 'CLEAN' },
            bankGroups: Object.values(bankGroups),
        };
    },

    async searchTransactions(q) {
        return TransactionsRepository.search(q);
    },

    async getFundFlow(caseId) {
        // FundFlowService is unchanged — it reads from evidence files
        const FFS = require('../../services/FundFlowService');
        return FFS.extractFlowFromEvidence(caseId);
    },
};

module.exports = TransactionsService;
