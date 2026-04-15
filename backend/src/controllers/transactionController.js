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
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const { case_id } = req.body;

        // 🟢 STEP 1: Process File Location
        const caseExcelDir = path.join('uploads', 'excels', case_id.toString());
        if (!fs.existsSync(caseExcelDir)) {
            fs.mkdirSync(caseExcelDir, { recursive: true });
        }

        const targetPath = path.join(caseExcelDir, req.file.filename);
        // Path normalization for DB
        const dbFilePath = targetPath.replace(/\\/g, '/');

        // Parse file
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rawData.length === 0) return res.status(400).json({ success: false, message: 'Excel is empty' });

        const pool = await poolPromise;
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // 🟠 STEP 2: Bind File to Case (Insert into case_evidence)
        const evidenceRequest = new mssql.Request(transaction);
        await evidenceRequest
            .input('case_id', mssql.Int, case_id)
            .input('file_path', mssql.NVarChar, dbFilePath)
            .input('file_name', mssql.NVarChar, req.file.originalname)
            .input('description', mssql.NVarChar, 'Forensic Money Trail Excel Artifact')
            .query('INSERT INTO case_evidence (case_id, file_path, file_name, description) VALUES (@case_id, @file_path, @file_name, @description)');

        // 🔵 STEP 3: Process Transactions into Money Trail
        const bankGroups = {};
        let totalRecords = 0;
        const lastNodeAtLayer = {}; // Track parents for implicit layer linking

        for (const row of rawData) {
            try {
                const receiver_acc = row['Account No'] || row['Account No.'] || row['Account Number'] || row['Account No./ (Wallet/PG/PA) Id'] || row['Wallet ID'] || row['Target Account'] || row['Beneficiary Account'] || row['Dest Account'] || row['ACCOUNT NO'];
                const utr_no = row['Transaction Id / UTR Number'] || row['Transaction Id / UTR Number2'] || row['UTR'] || row['Transaction Id'] || row['Ref No'] || row['Reference No'] || row['UTR No'] || row['TRANSACTION ID'] || row['UTR NUMBER'];

                if (!receiver_acc || !utr_no) continue;

                let rawAmount = row['Transaction Amount'] || row['Amount Rs.'] || row['Amount'] || row['TRANSACTION AMOUNT'] || 0;
                const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/,/g, '').trim()) : parseFloat(rawAmount);

                let rawDate = row['Transaction Date'] || row['Date'] || row['TRANSACTION DATE'] || new Date();
                const trans_date = (typeof rawDate === 'number') ? new Date((rawDate - 25569) * 86400 * 1000) : new Date(rawDate);

                let rawBank = row['Bank/Bc'] || row['Bank/ Bc'] || row['Bank Name'] || row['Bank/FIs'] || row['Bank / FIs'] || row['Target Bank'] || row['Beneficiary Bank'] || row['Bank'] || row['BANK NAME'] || 'Unknown Bank';

                let bankName = (rawBank ? rawBank.toString() : 'Unknown Bank')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/Reassign Back To/gi, '')
                    .replace(/Back To/gi, '')
                    .trim()
                    .split(' ')
                    .filter(word => word.length > 0)
                    .join(' ') || 'Unknown Bank';
                const ifsc = row['Ifsc Code'] || row['IFSC'] || 'N/A';
                const layerStr = row['Layer'] !== undefined ? row['Layer'].toString() : '';
                const match = layerStr.match(/\d+/);
                const numericLayer = match ? parseInt(match[0], 10) : null;
                const layer = row['Layer'] || (row['Layer'] !== undefined ? `Layer ${row['Layer']}` : 'Layer 1');

                // Advanced Sender Inference based on LEA layer groupings
                let sender_acc = 'Case Root'; // Default
                let actualSender =
                    row['Sender Account'] || row['Source Account'] || row['From Account'] ||
                    row['Sender Acc'] || row['From Acc'] || row['Debit Account'] ||
                    row['Sender Account No'] || row['sender_account'] || row['SENDER ACCOUNT'] ||
                    row['SENDER ACC'] || row['Payer Account'] || row['Payer Acc'] ||
                    row['account_number'];

                if (actualSender) {
                    sender_acc = actualSender;
                } else if (numericLayer !== null) {
                    if (numericLayer === 1) {
                        sender_acc = 'Case Root';
                    } else if (numericLayer > 1 && lastNodeAtLayer[numericLayer - 1]) {
                        sender_acc = lastNodeAtLayer[numericLayer - 1];
                    }
                }

                // Update tracking for future rows
                if (numericLayer !== null) {
                    lastNodeAtLayer[numericLayer] = receiver_acc.toString().trim();
                }

                const request = new mssql.Request(transaction);
                await request
                    .input('case_id', mssql.Int, case_id)
                    .input('sender_acc', mssql.NVarChar, sender_acc.toString().trim())
                    .input('receiver_acc', mssql.NVarChar, receiver_acc.toString().trim())
                    .input('amount', mssql.Decimal(18, 2), isNaN(amount) ? 0 : amount)
                    .input('utr_no', mssql.NVarChar, utr_no.toString().trim().substring(0, 100)) // Safety truncation
                    .input('trans_date', mssql.DateTime, isNaN(trans_date.getTime()) ? new Date() : trans_date)
                    .input('platform', mssql.NVarChar, bankName.substring(0, 50))
                    .query('INSERT INTO case_transactions (case_id, sender_acc, receiver_acc, amount, utr_no, trans_date, platform) VALUES (@case_id, @sender_acc, @receiver_acc, @amount, @utr_no, @trans_date, @platform)');

                const bKey = bankName;
                if (!bankGroups[bKey]) bankGroups[bKey] = { name: bKey, records: [] };
                bankGroups[bKey].records.push({
                    account: receiver_acc.toString().trim(),
                    utr: utr_no.toString().trim(),
                    layer: layer.toString(),
                    ifsc: ifsc.toString(),
                    amount: amount
                });
                totalRecords++;
            } catch (rowErr) {
                console.warn('[ROW_IMPORT_SKIP]', rowErr.message);
                // Continue to next row instead of failing entire import
            }
        }

        await transaction.commit();
        console.log(`[SUCCESS] Committed ${totalRecords} transactions to DB.`);

        // Move file for permanent storage - handle cross-drive issues
        try {
            fs.copyFileSync(req.file.path, targetPath);
            fs.unlinkSync(req.file.path);
        } catch (copyErr) {
            console.error('[FILE_MOVE_ERROR]', copyErr);
            // If copy fails, we still have the DB transactions, but the file link might be broken
        }

        res.json({
            success: true,
            message: `Imported ${totalRecords} transactions`,
            stats: { totalBanks: Object.keys(bankGroups).length, totalRecords: totalRecords, status: 'CLEAN' },
            bankGroups: Object.values(bankGroups)
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('[IMPORT_ERROR_CRITICAL]', err);
        res.status(500).json({ success: false, message: 'Excel import failed', error: err.message });
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
