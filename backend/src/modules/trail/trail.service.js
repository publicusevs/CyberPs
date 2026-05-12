/**
 * trail.service.js — Business logic for Money Trail analysis.
 *
 * Wraps the existing moneyTrailService.js (unchanged) and provides
 * a clean service interface for the trail controller to use.
 * The core forensic graph algorithms remain untouched.
 */

'use strict';

const xlsx = require('xlsx');
const fs = require('fs');
const TransactionsRepository = require('../transactions/transactions.repository');
const { buildGraph, parseExcelForTrail, detectColumns } = require('../../services/moneyTrailService');
const AppError = require('../../core/AppError');

const TrailService = {

    /**
     * Build money trail graph from case's DB transactions.
     */
    async analyzeFromCase(caseId, { depth, startAcc, minAmount, maxAmount }) {
        const transactions = await TransactionsRepository.getByCase(caseId);

        if (transactions.length === 0) {
            return {
                nodes: [], edges: [], layers: {},
                circularEdges: [], suspiciousNodes: [],
                stats: { totalNodes: 0, totalEdges: 0, totalLayers: 0, circularTransactions: 0, suspiciousNodes: 0, totalFlow: 0 },
            };
        }

        return buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc && startAcc !== 'null' ? startAcc : null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount && maxAmount !== 'null' ? parseFloat(maxAmount) : Infinity,
        });
    },

    /**
     * Build money trail graph from uploaded Excel file.
     */
    async analyzeFromExcel(file, { depth, startAcc, minAmount, maxAmount }) {
        if (!file) throw new AppError('No file uploaded', 400);

        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Cleanup temp file
        const cleanup = () => { try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ } };

        if (rawData.length === 0) {
            cleanup();
            throw new AppError('Excel file appears to be empty', 400);
        }

        const detectedColumns = detectColumns(rawData);
        const transactions = parseExcelForTrail(rawData);

        if (transactions.length === 0) {
            cleanup();
            throw Object.assign(
                new AppError('Could not extract transaction data. Ensure Excel has Account No / Account Number column.', 400),
                { detectedColumns }
            );
        }

        const graphData = buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc && startAcc !== 'null' ? startAcc : null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount && maxAmount !== 'null' ? parseFloat(maxAmount) : Infinity,
        });

        cleanup();

        return {
            graphData,
            rawRows: rawData.length,
            parsedTransactions: transactions.length,
            detectedColumns,
            transactions,
        };
    },

    /**
     * Re-analyze existing transaction data with new filter params.
     */
    async reanalyze(transactions, { depth, startAcc, minAmount, maxAmount }) {
        if (!transactions || !Array.isArray(transactions)) {
            throw new AppError('Transactions array required', 400);
        }

        return buildGraph(transactions, {
            maxDepth: Math.min(parseInt(depth) || 5, 10),
            startAcc: startAcc || null,
            minAmount: parseFloat(minAmount) || 0,
            maxAmount: maxAmount ? parseFloat(maxAmount) : Infinity,
        });
    },
};

module.exports = TrailService;
