const { poolPromise, mssql } = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

exports.addTransaction = async (req, res) => {
    try {
        const { case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform } = req.body;
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
        res.json({ success: true, message: 'Transaction added' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding transaction' });
    }
};

exports.importExcel = async (req, res) => {
    let transaction;
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const { case_id } = req.body;
        if (!case_id) return res.status(400).json({ success: false, message: 'No case_id provided' });

        // 🟢 STEP 1: Process File Location
        const caseExcelDir = path.join('uploads', 'excels', case_id.toString());
        if (!fs.existsSync(caseExcelDir)) {
            fs.mkdirSync(caseExcelDir, { recursive: true });
        }

        const targetPath = path.join(caseExcelDir, req.file.filename);
        const dbFilePath = targetPath.replace(/\\/g, '/');

        // Parse file
        const workbook = xlsx.readFile(req.file.path);
        
        // Smart Sheet Detection
        const targetSheetNames = ['Money Transfer to', 'Money Transfer To', 'money transfer to', 'Sheet1'];
        let sheetName = workbook.SheetNames[0];
        for (const target of targetSheetNames) {
            const found = workbook.SheetNames.find(s => s.trim().toLowerCase() === target.toLowerCase());
            if (found) { sheetName = found; break; }
        }
        console.log(`[EXCEL] Sheets: [${workbook.SheetNames.join(', ')}] → Using: "${sheetName}"`);
        
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`[EXCEL] ${rawData.length} rows from "${sheetName}"`);

        if (rawData.length === 0) return res.status(400).json({ success: false, message: 'Excel sheet is empty' });

        // Log headers for debugging
        console.log('[EXCEL] Headers:', Object.keys(rawData[0]));

        const pool = await poolPromise;
        if (!pool) return res.status(503).json({ success: false, message: 'Database not connected' });

        // 🟠 STEP 2: Evidence link (NON-FATAL — import continues even if this fails)
        try {
            await pool.request()
                .input('case_id', mssql.Int, case_id)
                .input('file_path', mssql.NVarChar, dbFilePath)
                .input('file_name', mssql.NVarChar, req.file.originalname)
                .input('description', mssql.NVarChar, 'Forensic Money Trail Excel Artifact')
                .query('INSERT INTO case_evidence (case_id, file_path, file_name, description) VALUES (@case_id, @file_path, @file_name, @description)');
            console.log('[EXCEL] Evidence record created');
        } catch (evErr) {
            console.warn('[EXCEL] Evidence insert skipped:', evErr.message);
        }

        // 🟠 STEP 2.5: Clear old transactions to ensure EXACT synchronization with the latest Excel
        try {
            await pool.request()
                .input('case_id', mssql.Int, case_id)
                .query('DELETE FROM case_transactions WHERE case_id = @case_id');
            console.log(`[EXCEL] Cleared old transactions for case ${case_id}`);
        } catch (delErr) {
            console.warn('[EXCEL] Clear old transactions failed:', delErr.message);
        }

        // 🔵 STEP 3: Parse rows
        const bankGroups = {};
        const parsedRows = [];
        let skippedRows = 0;

        for (const row of rawData) {
            try {
                const receiver_acc = row['Account No'] || row['Account No.'] || row['Account Number'] 
                    || row['Account No./ (Wallet /PG/PA) Id'] || row['Account No./ (Wallet/PG/PA) Id']
                    || row['Account No./(Wallet /PG/PA) Id'] || row['Account No./(Wallet/PG/PA) Id']
                    || row['Wallet ID'] || row['Target Account'] || row['Beneficiary Account'] 
                    || row['Dest Account'] || row['ACCOUNT NO']
                    || row['Account No./ (Wallet /PG/PA)  Id'];

                const utr_no = row['Transaction Id / UTR Number'] || row['Transaction ID / UTR Number']
                    || row['Transaction Id / UTR Number2'] || row['Transaction ID / UTR Number2']
                    || row['UTR'] || row['Transaction Id'] || row['Transaction ID']
                    || row['Ref No'] || row['Reference No'] || row['UTR No'] 
                    || row['TRANSACTION ID'] || row['UTR NUMBER'];

                if (!receiver_acc && !utr_no) { skippedRows++; continue; }

                const finalReceiverAcc = receiver_acc || 'N/A';
                const finalUtrNo = utr_no || 'N/A';

                let rawAmount = row['Transaction Amount'] || row['Disputed Amount'] || row['Amount Rs.'] || row['Amount'] || row['TRANSACTION AMOUNT'] || 0;
                const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/,/g, '').trim()) : parseFloat(rawAmount);

                let rawDate = row['Transaction Date'] || row['Date'] || row['TRANSACTION DATE'] || row['Date of Action'] || new Date();
                const trans_date = (typeof rawDate === 'number') ? new Date((rawDate - 25569) * 86400 * 1000) : new Date(rawDate);

                let rawBank = row['Bank/FIs'] || row['Bank/Bc'] || row['Bank/ Bc'] || row['Bank Name'] || row['Bank / FIs'] || row['Target Bank'] || row['Beneficiary Bank'] || row['Bank'] || row['BANK NAME'] || 'Unknown Bank';
                let bankName = (rawBank ? rawBank.toString() : 'Unknown Bank')
                    .replace(/<[^>]*>/g, ' ').replace(/Reassign Back To/gi, '').replace(/Back To/gi, '')
                    .trim().split(' ').filter(w => w.length > 0).join(' ') || 'Unknown Bank';

                const ifsc = row['Ifsc Code'] || row['IFSC Code'] || row['IFSC'] || 'N/A';
                const layer = row['Layer'] || 'Layer 1';

                parsedRows.push({
                    case_id: parseInt(case_id),
                    sender_acc: 'Case Root',
                    receiver_acc: finalReceiverAcc.toString().trim().substring(0, 50),
                    amount: isNaN(amount) ? 0 : amount,
                    utr_no: finalUtrNo.toString().trim().substring(0, 100),
                    trans_date: isNaN(trans_date.getTime()) ? new Date() : trans_date,
                    platform: bankName.substring(0, 50)
                });

                const bKey = bankName;
                if (!bankGroups[bKey]) bankGroups[bKey] = { name: bKey, records: [] };
                bankGroups[bKey].records.push({
                    account: finalReceiverAcc.toString().trim(),
                    utr: finalUtrNo.toString().trim(),
                    layer: layer.toString(),
                    ifsc: ifsc.toString(),
                    amount: amount
                });
            } catch (rowErr) {
                console.warn('[ROW_SKIP]', rowErr.message);
                skippedRows++;
            }
        }
        console.log(`[EXCEL] Parsed: ${parsedRows.length} valid, ${skippedRows} skipped`);

        if (parsedRows.length === 0) {
            return res.status(400).json({ success: false, message: `No valid rows found. Skipped: ${skippedRows}. Headers: ${Object.keys(rawData[0]).join(', ')}` });
        }

        // 🚀 STEP 4: Insert transactions — try BULK first, fallback to row-by-row
        let insertMethod = 'bulk';
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

            for (const r of parsedRows) {
                table.rows.add(r.case_id, r.sender_acc, r.receiver_acc, r.amount, r.utr_no, r.trans_date, r.platform);
            }

            await pool.request().bulk(table);
            console.log(`[EXCEL] Bulk inserted ${parsedRows.length} rows`);
        } catch (bulkErr) {
            console.warn('[EXCEL] Bulk failed, falling back to row-by-row:', bulkErr.message);
            insertMethod = 'row-by-row';
            
            // Fallback: row-by-row INSERT
            for (const r of parsedRows) {
                try {
                    await pool.request()
                        .input('case_id', mssql.Int, r.case_id)
                        .input('sender_acc', mssql.NVarChar, r.sender_acc)
                        .input('receiver_acc', mssql.NVarChar, r.receiver_acc)
                        .input('amount', mssql.Decimal(18, 2), r.amount)
                        .input('utr_no', mssql.NVarChar, r.utr_no)
                        .input('trans_date', mssql.DateTime, r.trans_date)
                        .input('platform', mssql.NVarChar, r.platform)
                        .query('INSERT INTO case_transactions (case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform) VALUES (@case_id, @sender_acc, @receiver_acc, @amount, @utr_no, @trans_date, @platform)');
                } catch (rowInsertErr) {
                    console.warn('[ROW_INSERT_FAIL]', rowInsertErr.message);
                }
            }
            console.log(`[EXCEL] Row-by-row insert completed`);
        }

        // Move file
        try {
            fs.copyFileSync(req.file.path, targetPath);
            fs.unlinkSync(req.file.path);
        } catch (copyErr) {
            console.warn('[FILE_MOVE_WARN]', copyErr.message);
        }

        res.json({
            success: true,
            message: `Imported ${parsedRows.length} transactions (${insertMethod})`,
            stats: { totalBanks: Object.keys(bankGroups).length, totalRecords: parsedRows.length, status: 'CLEAN' },
            bankGroups: Object.values(bankGroups)
        });
    } catch (err) {
        if (transaction) try { await transaction.rollback(); } catch(e) {}
        console.error('[IMPORT_CRITICAL]', err);
        try { fs.appendFileSync('import_errors.log', `[${new Date().toISOString()}] ${err.stack || err.message}\n`); } catch(e) {}
        res.status(500).json({ success: false, message: err.message || 'Unknown import error', stack: err.stack });
    }
};

exports.searchTransactions = async (req, res) => {
    try {
        const { q } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('q', mssql.NVarChar, `%${q}%`)
            .query('SELECT t.*, c.fir_no FROM case_transactions t JOIN cases c ON t.case_id = c.case_id WHERE t.sender_acc LIKE @q OR t.receiver_acc LIKE @q OR t.utr_no LIKE @q');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

exports.getFundFlowByCaseId = async (req, res) => {
    try {
        const { id } = req.params;
        const FundFlowService = require('../services/FundFlowService');
        const flowRecords = await FundFlowService.extractFlowFromEvidence(id);
        
        res.json({ success: true, data: flowRecords });
    } catch (err) {
        console.error('[FUND_FLOW_ERROR]', err);
        res.status(500).json({ success: false, message: 'Error extracting fund flow data' });
    }
};
