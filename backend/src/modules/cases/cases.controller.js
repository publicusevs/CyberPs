/**
 * cases.controller.js — Thin HTTP layer for Cases domain.
 * All methods parse request → call CasesService → send response.
 */

'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const CasesService = require('./cases.service');

exports.createCase = asyncHandler(async (req, res) => {
    const result = await CasesService.createCase(req.body, req.user, req.file);
    sendCreated(res, result, 'Case registered successfully');
});

exports.updateFullCase = asyncHandler(async (req, res) => {
    const result = await CasesService.updateFullCase(req.params.id, req.body, req.file);
    sendSuccess(res, result, 'Case updated successfully');
});

exports.getAllCases = asyncHandler(async (req, res) => {
    const data = await CasesService.getAllCases(req.user);
    sendSuccess(res, data);
});

exports.getCaseById = asyncHandler(async (req, res) => {
    const result = await CasesService.getCaseById(req.params.id, req.user.police_station_id);
    res.json({ success: true, ...result }); // Preserve exact original response shape
});

exports.updateProfiles = asyncHandler(async (req, res) => {
    await CasesService.updateProfiles(req.params.id, req.body);
    sendSuccess(res, null, 'Profiles updated successfully');
});

exports.addNote = asyncHandler(async (req, res) => {
    await CasesService.addNote({ ...req.body, case_id: req.params.id, user_id: req.user.user_id });
    sendSuccess(res, null, 'Note added');
});

exports.searchCases = asyncHandler(async (req, res) => {
    const data = await CasesService.searchCases(req.query.q);
    sendSuccess(res, data);
});

exports.updateStatus = asyncHandler(async (req, res) => {
    await CasesService.updateStatus(req.params.id, req.body, req.user.user_id);
    sendSuccess(res, null, 'Status updated');
});

exports.addEvidence = asyncHandler(async (req, res) => {
    await CasesService.addEvidence(req.files, req.body);
    sendSuccess(res, null, 'Evidence uploaded successfully');
});

exports.deleteFile = asyncHandler(async (req, res) => {
    await CasesService.deleteFile(req.body);
    sendSuccess(res, null, 'File deleted successfully');
});

exports.saveNotice = asyncHandler(async (req, res) => {
    const result = await CasesService.saveNotice(req.body);
    sendSuccess(res, result, 'Notice saved to dossier');
});

exports.getNodalRecipients = asyncHandler(async (req, res) => {
    const data = await CasesService.getNodalRecipients(req.params.id);
    sendSuccess(res, data);
});

exports.sendNodalEmails = asyncHandler(async (req, res) => {
    const result = await CasesService.sendNodalEmails(req.body);
    sendSuccess(res, result, 'Mailing process complete');
});
