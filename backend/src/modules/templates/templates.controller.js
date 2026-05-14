'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const TemplatesRepository = require('./templates.repository');

// ---- TEMPLATES ----
exports.getAllTemplates = asyncHandler(async (req, res) => {
    const data = await TemplatesRepository.getAllTemplates();
    sendSuccess(res, data);
});

exports.getTemplateById = asyncHandler(async (req, res) => {
    const data = await TemplatesRepository.getTemplateById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Template not found' });
    sendSuccess(res, data);
});

exports.createTemplate = asyncHandler(async (req, res) => {
    const id = await TemplatesRepository.createTemplate(req.body);
    sendCreated(res, { template_id: id }, 'Template created successfully');
});

exports.updateTemplate = asyncHandler(async (req, res) => {
    await TemplatesRepository.updateTemplate(req.params.id, req.body);
    sendSuccess(res, null, 'Template updated successfully');
});

exports.deleteTemplate = asyncHandler(async (req, res) => {
    await TemplatesRepository.deleteTemplate(req.params.id);
    sendSuccess(res, null, 'Template deleted successfully');
});

// ---- GLOBAL VARIABLES ----
exports.getAllVariables = asyncHandler(async (req, res) => {
    const data = await TemplatesRepository.getAllVariables();
    sendSuccess(res, data);
});

exports.createVariable = asyncHandler(async (req, res) => {
    const id = await TemplatesRepository.createVariable(req.body);
    sendCreated(res, { variable_id: id }, 'Variable created successfully');
});

exports.updateVariable = asyncHandler(async (req, res) => {
    await TemplatesRepository.updateVariable(req.params.id, req.body);
    sendSuccess(res, null, 'Variable updated successfully');
});

exports.deleteVariable = asyncHandler(async (req, res) => {
    await TemplatesRepository.deleteVariable(req.params.id);
    sendSuccess(res, null, 'Variable deleted successfully');
});
