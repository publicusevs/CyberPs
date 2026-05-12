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

// Smart column aliases for account numbers across different bank Excel formats
const ACCOUNT_COLS = [
    'Account No', 'Account No.', 'Account Number', 'Account No./ (Wallet /PG/PA) Id',
    'Account No./ (Wallet/PG/PA) Id', 'Account No./(Wallet /PG/PA) Id',
    'Account No./(Wallet/PG/PA) Id', 'Wallet ID', 'Target Account', 'Beneficiary Account',
    'Dest Account', 'ACCOUNT NO', 'Account No./ (Wallet /PG/PA)  Id',
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

        // 1. Setup target directory
        const caseExcelDir = path.join('uploads', 'excels', caseId.toString());
        if (!fs.existsSync(caseExcelDir)) fs.mkdirSync(caseExcelDir, { recursive: true });

        const targetPath = path.join(caseExcelDir, file.filename);
        const dbFilePath = targetPath.replace(/\\/g, '/');

        // 2. Parse workbook
        const workbook = xlsx.readFile(file.path);
        const targetSheetNames = ['Money Transfer to', 'Money Transfer To', 'money transfer to', 'Sheet1'];
        let sheetName = workbook.SheetNames[0];
        for (const target of targetSheetNames) {
            const found = workbook.SheetNames.find((s) => s.trim().toLowerCase() === target.toLowerCase());
            if (found) { sheetName = found; break; }
        }
        logger.debug(`[EXCEL] Sheets: [${workbook.SheetNames.join(', ')}] → Using: "${sheetName}"`);

        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (rawData.length === 0) throw new AppError('Excel sheet is empty', 400);
        logger.debug(`[EXCEL] Headers: ${Object.keys(rawData[0]).join(', ')}`);

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

        // 4. Clear old transactions for this case
        try {
            await TransactionsRepository.deleteByCase(caseId);
        } catch (delErr) {
            logger.warn('[EXCEL] Clear old transactions failed:', delErr.message);
        }

        // 5. Parse rows
        const bankGroups = {};
        const parsedRows = [];
        let skippedRows = 0;

        for (const row of rawData) {
            try {
                const receiver_acc = getCol(row, ACCOUNT_COLS);
                const utr_no = getCol(row, UTR_COLS);

                if (!receiver_acc && !utr_no) { skippedRows++; continue; }

                const finalReceiverAcc = (receiver_acc || 'N/A').toString().trim().substring(0, 50);
                const finalUtrNo = (utr_no || 'N/A').toString().trim().substring(0, 100);

                let rawAmount = getCol(row, AMOUNT_COLS) || 0;
                const amount = typeof rawAmount === 'string'
                    ? parseFloat(rawAmount.replace(/,/g, '').trim())
                    : parseFloat(rawAmount);

                let rawDate = getCol(row, DATE_COLS) || new Date();
                const trans_date = typeof rawDate === 'number'
                    ? new Date((rawDate - 25569) * 86400 * 1000)
                    : new Date(rawDate);

                let rawBank = getCol(row, BANK_COLS) || 'Unknown Bank';
                let bankName = (rawBank ? rawBank.toString() : 'Unknown Bank')
                    .replace(/<[^>]*>/g, ' ').replace(/Reassign Back To/gi, '').replace(/Back To/gi, '')
                    .trim().split(' ').filter((w) => w.length > 0).join(' ') || 'Unknown Bank';

                const layer = row['Layer'] || 'Layer 1';
                const ifsc = row['Ifsc Code'] || row['IFSC Code'] || row['IFSC'] || 'N/A';

                parsedRows.push({
                    case_id: parseInt(caseId),
                    sender_acc: 'Case Root',
                    receiver_acc: finalReceiverAcc,
                    amount: isNaN(amount) ? 0 : amount,
                    utr_no: finalUtrNo,
                    trans_date: isNaN(trans_date.getTime()) ? new Date() : trans_date,
                    platform: bankName.substring(0, 50),
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
