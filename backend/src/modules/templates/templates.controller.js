'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const TemplatesService = require('./templates.service');

exports.getAllTemplates = asyncHandler(async (req, res) => {
    const data = await TemplatesService.getAll();
    sendSuccess(res, data);
});

exports.getTemplateById = asyncHandler(async (req, res) => {
    const data = await TemplatesService.getById(req.params.id);
    sendSuccess(res, data);
});

exports.createTemplate = asyncHandler(async (req, res) => {
    await TemplatesService.create(req.body);
    sendSuccess(res, null, 'Template created successfully');
});

exports.updateTemplate = asyncHandler(async (req, res) => {
    await TemplatesService.update(req.params.id, req.body);
    sendSuccess(res, null, 'Template updated successfully');
});

exports.deleteTemplate = asyncHandler(async (req, res) => {
    await TemplatesService.remove(req.params.id);
    sendSuccess(res, null, 'Template deleted successfully');
});
