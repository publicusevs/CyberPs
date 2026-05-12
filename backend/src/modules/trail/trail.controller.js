'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const TrailService = require('./trail.service');

exports.analyzeTrailFromCase = asyncHandler(async (req, res) => {
    const data = await TrailService.analyzeFromCase(req.params.case_id, req.query);
    const isEmpty = data.nodes && data.nodes.length === 0;
    res.json({
        success: true,
        data,
        source: 'database',
        transactionCount: isEmpty ? 0 : undefined,
        message: isEmpty ? 'No transactions found for this case' : undefined,
    });
});

exports.analyzeTrailFromExcel = asyncHandler(async (req, res) => {
    const result = await TrailService.analyzeFromExcel(req.file, req.body);
    res.json({
        success: true,
        data: result.graphData,
        source: 'excel',
        rawRows: result.rawRows,
        parsedTransactions: result.parsedTransactions,
        detectedColumns: result.detectedColumns,
        transactions: result.transactions,
    });
});

exports.reanalyzeTrail = asyncHandler(async (req, res) => {
    const data = await TrailService.reanalyze(req.body.transactions, req.body);
    sendSuccess(res, data);
});
