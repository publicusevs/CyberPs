const { poolPromise, mssql } = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');
const { buildGraph, parseExcelForTrail, detectColumns } = require('../services/moneyTrailService');

/**
 * Analyze money trail from existing case transactions in DB
 * GET /api/trail/case/:case_id
 */
exports.analyzeTrailFromCase = async (req, res) => {
    try {
        const { case_id } = req.params;
        const {
            depth = 5,
            startAcc = null,
            minAmount = 0,
            maxAmount = null,
        } = req.query;

        const pool = await poolPromise;
        if (!pool) return res.status(503).json({ success: false, message: 'Database connection unavailable' });

        const result = await pool.request()
            .input('case_id', mssql.Int, parseInt(case_id))
            .query(`
                SELECT sender_acc, receiver_acc, amount, utr_no, trans_date, platform
                FROM case_transactions
                WHERE case_id = @case_id
                ORDER BY trans_date ASC
            `);

        const transactions = result.recordset;

        if (transactions.length === 0) {
            return res.json({
                success: true,
                data: {
                    nodes: [], edges: [], layers: {},
                    circularEdges: [], suspiciousNodes: [],
                    stats: { totalNodes: 0, totalEdges: 0, totalLayers: 0, circularTransactions: 0, suspiciousNodes: 0, totalFlow: 0 }
                },
                message: 'No transactions found for this case'
            });
        }

        const graphData = buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc && startAcc !== 'null' ? startAcc : null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount && maxAmount !== 'null' ? parseFloat(maxAmount) : Infinity,
        });

        res.json({ success: true, data: graphData, source: 'database', transactionCount: transactions.length });

    } catch (err) {
        console.error('[TRAIL_CASE_ERROR]', err);
        res.status(500).json({ success: false, message: 'Trail analysis failed', error: err.message });
    }
};

/**
 * Analyze money trail from uploaded Excel (standalone, no case required)
 * POST /api/trail/analyze-excel
 */
exports.analyzeTrailFromExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const {
            depth = 5,
            startAcc = null,
            minAmount = 0,
            maxAmount = null,
        } = req.body;

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rawData.length === 0) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ success: false, message: 'Excel file appears to be empty' });
        }

        const detectedColumns = detectColumns(rawData);
        const transactions = parseExcelForTrail(rawData);

        if (transactions.length === 0) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({
                success: false,
                message: 'Could not extract transaction data. Ensure Excel has Account No / Account Number column.',
                detectedColumns
            });
        }

        const graphData = buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc && startAcc !== 'null' ? startAcc : null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount && maxAmount !== 'null' ? parseFloat(maxAmount) : Infinity,
        });

        // Clean up uploaded temp file
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        res.json({
            success: true,
            data: graphData,
            source: 'excel',
            rawRows: rawData.length,
            parsedTransactions: transactions.length,
            detectedColumns
        });

    } catch (err) {
        console.error('[TRAIL_EXCEL_ERROR]', err);
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
        res.status(500).json({ success: false, message: 'Excel trail analysis failed', error: err.message });
    }
};

/**
 * Re-analyze with new filter options (POST with existing data)
 * POST /api/trail/reanalyze
 */
exports.reanalyzeTrail = async (req, res) => {
    try {
        const { transactions, depth = 5, startAcc = null, minAmount = 0, maxAmount = null } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ success: false, message: 'Transactions array required' });
        }

        const graphData = buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc || null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount ? parseFloat(maxAmount) : Infinity,
        });

        res.json({ success: true, data: graphData });
    } catch (err) {
        console.error('[TRAIL_REANALYZE_ERROR]', err);
        res.status(500).json({ success: false, message: 'Reanalysis failed', error: err.message });
    }
};
