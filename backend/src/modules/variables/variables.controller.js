'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const VariablesService = require('./variables.service');

exports.getAllVariables = asyncHandler(async (req, res) => {
    const data = await VariablesService.getAll();
    sendSuccess(res, data);
});

exports.upsertVariable = asyncHandler(async (req, res) => {
    await VariablesService.upsert(req.body);
    sendSuccess(res, null, 'Variable saved successfully');
});

exports.updateVariable = asyncHandler(async (req, res) => {
    await VariablesService.update(req.params.id, req.body);
    sendSuccess(res, null, 'Variable updated successfully');
});

exports.deleteVariable = asyncHandler(async (req, res) => {
    await VariablesService.remove(req.params.id);
    sendSuccess(res, null, 'Variable deleted');
});
