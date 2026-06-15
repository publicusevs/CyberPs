const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { poolPromise, mssql } = require('../config/db');

class FundFlowService {
    /**
     * Retrieves the latest Excel evidence file for a given case and extracts rich fund flow data.
     * @param {number} caseId 
     * @returns {Promise<Array>} Rich transaction DTOs
     */
    static async extractFlowFromEvidence(caseId) {
        const pool = await poolPromise;
        if (!pool) throw new Error('Database connection unavailable');

        // Find the latest Excel artifact from case_evidence
        const evidenceResult = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query(`
                SELECT TOP 1 file_path 
                FROM case_evidence 
                WHERE case_id = @case_id 
                  AND (file_name LIKE '%.xlsx' OR file_name LIKE '%.xls' OR description LIKE '%Excel%')
                ORDER BY uploaded_at DESC
            `);

        if (evidenceResult.recordset.length === 0) {
            // No Excel found, fallback to basic DB transactions
            return this.getBasicTransactions(pool, caseId);
        }

        let dbFilePath = evidenceResult.recordset[0].file_path;
        
        // Resolve absolute path safely stripping any leading slash
        const relativePath = dbFilePath.replace(/^\//, '');
        const isPkg = typeof process.pkg !== 'undefined';
        const baseDir = isPkg
            ? path.join(path.dirname(process.execPath), '..')
            : path.join(__dirname, '..', '..');
        const absolutePath = path.resolve(baseDir, relativePath);
        
        if (!fs.existsSync(absolutePath)) {
            console.warn(`[FundFlowService] Excel file missing on disk: ${absolutePath}`);
            return this.getBasicTransactions(pool, caseId);
        }

        return this.parseExcelFlow(absolutePath);
    }

    static parseExcelFlow(filePath) {
        const workbook = xlsx.readFile(filePath);
        const targetSheetNames = ['Money Transfer to', 'Money Transfer To', 'money transfer to', 'Sheet1'];
        let sheetName = workbook.SheetNames[0];
        
        for (const target of targetSheetNames) {
            const found = workbook.SheetNames.find(s => s.trim().toLowerCase() === target.toLowerCase());
            if (found) { sheetName = found; break; }
        }

        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        const getValueFuzzy = (row, keys) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
                const found = rowKeys.find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
                if (found) return row[found];
            }
            return null;
        };

        const cleanAccount = (acc) => {
            if (!acc) return null;
            let str = acc.toString().trim();
            if (str.toUpperCase() === 'N/A') return null;
            
            // Keep original if it's special like 'Case Root'
            if (str.toLowerCase().includes('case') || str.toLowerCase().includes('root')) {
                return str.replace(/[^a-zA-Z0-9 ]/g, '').trim();
            }

            // For numeric accounts, strip symbols but keep the value
            let numeric = str.replace(/[^0-9]/g, '').replace(/^0+/, '');
            if (numeric.length > 0) return numeric;

            // For masked accounts or PG IDs (e.g. TLU100...), keep alphanumerics
            let alpha = str.replace(/[^a-zA-Z0-9]/g, '');
            return alpha.length > 0 ? alpha : str;
        };

        const allRecords = [];

        // 2. Data Extraction (NON-DESTRUCTIVE)
        for (const row of rawData) {
            // Identification of Source vs Destination accounts within a single row
            const accountA = (getValueFuzzy(row, ['Account No / Wallet / PG / PA Id', 'Sender Account', 'From Account']) || '').toString().trim();
            const accountB = (getValueFuzzy(row, ['Account No.', 'Beneficiary Account', 'To Account', 'Receiver Account']) || '').toString().trim();
            
            // We use accountA as the primary record account for display
            const originalAccount = accountA || accountB || 'N/A';
            const normalizedAccount = cleanAccount(originalAccount);

            // Clean both for graph building
            const cleanA = cleanAccount(accountA);
            const cleanB = cleanAccount(accountB);

            const utr_no = getValueFuzzy(row, ['Transaction Id / UTR Number', 'Transaction ID / UTR Number', 'Transaction Id / UTR Number2', 'UTR', 'Transaction Id', 'Transaction ID', 'Ref No', 'Reference No', 'UTR No']) || 'N/A';

            let rawAmount = getValueFuzzy(row, ['Transaction Amount', 'Disputed Amount', 'Amount Rs.', 'Amount', 'TRANSACTION AMOUNT']);
            let cleanAmtStr = (rawAmount || '0').toString().replace(/[^0-9.]/g, '');
            const amount = parseFloat(cleanAmtStr) || 0;

            let rawDate = getValueFuzzy(row, ['Transaction Date', 'Date', 'TRANSACTION DATE', 'Date of Action']);
            const trans_date = (typeof rawDate === 'number') ? new Date((rawDate - 25569) * 86400 * 1000) : new Date(rawDate);
            const dateStr = isNaN(trans_date.getTime()) ? (rawDate || 'N/A').toString() : trans_date.toLocaleDateString('en-GB');

            let rawBank = getValueFuzzy(row, ['Bank/FIs', 'Bank/Bc', 'Bank Name', 'Bank', 'Target Bank', 'Beneficiary Bank']) || 'Unknown Bank';
            let bankName = rawBank.toString().replace(/<[^>]*>/g, ' ').replace(/Reassign Back To/gi, '').trim() || 'Unknown Bank';

            const ifsc = getValueFuzzy(row, ['Ifsc Code', 'IFSC Code', 'IFSC']) || 'N/A';
            const ackNo = getValueFuzzy(row, ['Acknowledgement No', 'Acknowledgement No.', 'Ack No', 'ACK']) || 'N/A';
            const remarks = getValueFuzzy(row, ['Remarks', 'Remark', 'Comments']) || 'N/A';
            const actionTaken = getValueFuzzy(row, ['Action Taken By Bank', 'Action Taken', 'Status']) || 'N/A';
            const actionDateRaw = getValueFuzzy(row, ['Date of Action', 'Action Date', 'Action_Date']);
            const actionDate = (typeof actionDateRaw === 'number') ? new Date((actionDateRaw - 25569) * 86400 * 1000).toLocaleDateString('en-GB') : (actionDateRaw || 'N/A').toString();

            // Direction Detection (Debit = Source, Credit = Receiver)
            const typeRaw = (getValueFuzzy(row, ['Type', 'Transaction Type', 'DR/CR', 'Dr/Cr', 'Debit/Credit']) || '').toString().toUpperCase();
            const isDebit = typeRaw.includes('DR') || typeRaw.includes('DEBIT');

            allRecords.push({
                account: originalAccount,
                cleanAccount: normalizedAccount || originalAccount,
                utr: utr_no.toString().trim(),
                amount: amount,
                bank: bankName.substring(0, 50),
                date: isNaN(trans_date.getTime()) ? new Date() : trans_date,
                dateStr: dateStr,
                ifsc: ifsc.toString().trim(),
                ackNo: ackNo.toString().trim(),
                remarks: remarks.toString().trim(),
                actionTaken: actionTaken.toString().trim(),
                actionDate: actionDate,
                isDebit: isDebit,
                sourceAcc: cleanA,
                destAcc: cleanB,
                raw: row
            });
        }

        if (allRecords.length === 0) return [];

        // 3. FUND FLOW LOGIC (Build UTR clusters using cleaned accounts)
        const utrGroups = {};
        for (const rec of allRecords) {
            const normalizedUtr = rec.utr.toUpperCase();
            if (normalizedUtr === 'N/A') continue;
            if (!utrGroups[normalizedUtr]) utrGroups[normalizedUtr] = [];
            utrGroups[normalizedUtr].push(rec);
        }

        const edges = []; 
        const allCleanAccounts = new Set();
        for (const rec of allRecords) {
            if (rec.cleanAccount) allCleanAccounts.add(rec.cleanAccount);
            if (rec.sourceAcc) allCleanAccounts.add(rec.sourceAcc);
            if (rec.destAcc) allCleanAccounts.add(rec.destAcc);
        }
        
        // 1. Build edges from explicit Source -> Destination columns in rows
        for (const rec of allRecords) {
            if (rec.sourceAcc && rec.destAcc && rec.sourceAcc !== rec.destAcc) {
                edges.push({ source: rec.sourceAcc, dest: rec.destAcc });
            }
        }

        // 2. Build edges from UTR clustering (Multi-row same UTR)
        for (const [utr, cluster] of Object.entries(utrGroups)) {
            let sourceRec = cluster.find(r => r.isDebit);
            if (!sourceRec) {
                cluster.sort((a, b) => b.amount - a.amount);
                sourceRec = cluster[0];
            }
            for (const rec of cluster) {
                if (rec.cleanAccount !== sourceRec.cleanAccount) {
                    edges.push({ source: sourceRec.cleanAccount, dest: rec.cleanAccount });
                }
            }
        }

        // 4. DYNAMIC LAYER GENERATION (BFS)
        const layerMap = new Map();
        for (const acc of allCleanAccounts) layerMap.set(acc, 999);

        const destinationSet = new Set(edges.map(e => e.dest));
        
        // Priority Roots: Explicitly look for 'Case Root' or accounts that aren't destinations
        const roots = Array.from(allCleanAccounts).filter(acc => {
            const isCaseRoot = acc.toUpperCase().includes('CASEROOT') || acc.toUpperCase().includes('ROOT');
            return isCaseRoot || !destinationSet.has(acc);
        });
        
        const queue = [];
        for (const root of roots) {
            layerMap.set(root, 1);
            queue.push(root);
        }

        while (queue.length > 0) {
            const currentAcc = queue.shift();
            const currentLayer = layerMap.get(currentAcc);
            
            const children = edges
                .filter(e => e.source === currentAcc)
                .map(e => e.dest);
            
            for (const child of children) {
                if (currentLayer + 1 < layerMap.get(child)) {
                    layerMap.set(child, currentLayer + 1);
                    queue.push(child);
                }
            }
        }

        // Final cleanup for orphans
        for (const acc of allCleanAccounts) {
            if (layerMap.get(acc) === 999) layerMap.set(acc, 1);
        }

        // 5. DEDUPLICATION (Using Cleaned Account)
        const deduplicatedFlow = [];
        const uniqueSet = new Set();

        for (const rec of allRecords) {
            const computedLayer = layerMap.get(rec.cleanAccount) || 1;
            // Deduplicate based on cleaned account, UTR, and amount
            const uniqueKey = `${rec.cleanAccount}_${rec.utr.toUpperCase()}_${rec.amount}`;
            
            if (!uniqueSet.has(uniqueKey)) {
                uniqueSet.add(uniqueKey);
                deduplicatedFlow.push({
                    account: rec.account,
                    cleanAccount: rec.cleanAccount,
                    utr: rec.utr,
                    bank: rec.bank,
                    amount: rec.amount,
                    date: rec.date,
                    dateStr: rec.dateStr,
                    layer: computedLayer,
                    ifsc: rec.ifsc,
                    ackNo: rec.ackNo,
                    remarks: rec.remarks,
                    actionTaken: rec.actionTaken,
                    actionDate: rec.actionDate,
                    raw: rec.raw // Pass raw data through
                });
            }
        }

        // 🛡️ FAIL-SAFE: If filtering somehow resulted in 0, return RAW data
        if (deduplicatedFlow.length === 0 && rawData.length > 0) {
            console.log("All records filtered out — fallback triggered");
            return allRecords.map(r => ({ ...r, layer: 1 }));
        }

        return deduplicatedFlow;
    }

    /**
     * Fallback if no Excel is found, reads from case_transactions.
     */
    static async getBasicTransactions(pool, caseId) {
        const result = await pool.request()
            .input('case_id', mssql.Int, caseId)
            .query('SELECT receiver_acc as account, utr_no as utr, platform as bank, amount, trans_date as date FROM case_transactions WHERE case_id = @case_id');
        
        return result.recordset.map(r => ({
            ...r,
            layer: 1, // Fallback layer
            ifsc: 'N/A'
        }));
    }
}

module.exports = FundFlowService;
