'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const NoticesService = require('./notices.service');

exports.saveNotice = asyncHandler(async (req, res) => {
    await NoticesService.saveNotice(req.body, req.user);
    sendSuccess(res, null, 'Notice saved successfully');
});

exports.getNoticesByCase = asyncHandler(async (req, res) => {
    const data = await NoticesService.getNoticesByCase(req.params.id);
    sendSuccess(res, data);
});

exports.getNoticeDetail = asyncHandler(async (req, res) => {
    const data = await NoticesService.getNoticeDetail(req.params.id);
    sendSuccess(res, data);
});

exports.updateNotice = asyncHandler(async (req, res) => {
    await NoticesService.updateNotice(req.params.id, req.body);
    sendSuccess(res, null, 'Notice updated successfully');
});

exports.generateNotice = asyncHandler(async (req, res) => {
    const results = await NoticesService.generateBankNotices(req.body, req.user);
    sendCreated(res, results, `${results.length} notice(s) generated successfully`);
});

exports.getDispatchRegister = asyncHandler(async (req, res) => {
    const data = await NoticesService.getDispatchRegister(req.params.caseId);
    sendSuccess(res, data);
});
