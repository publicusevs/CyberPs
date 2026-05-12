'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const TransactionsService = require('./transactions.service');

exports.addTransaction = asyncHandler(async (req, res) => {
    await TransactionsService.addTransaction(req.body);
    sendSuccess(res, null, 'Transaction added');
});

exports.importExcel = asyncHandler(async (req, res) => {
    const result = await TransactionsService.importExcel(req.file, req.body.case_id);
    sendSuccess(res, result, result.message);
});

exports.searchTransactions = asyncHandler(async (req, res) => {
    const data = await TransactionsService.searchTransactions(req.query.q);
    sendSuccess(res, data);
});

exports.getFundFlowByCaseId = asyncHandler(async (req, res) => {
    const data = await TransactionsService.getFundFlow(req.params.id);
    sendSuccess(res, data);
});
