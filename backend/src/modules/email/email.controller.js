'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const EmailService = require('./email.service');

exports.sendTestEmail = asyncHandler(async (req, res) => {
    const result = await EmailService.sendTestEmail(req.body);
    sendSuccess(res, result, 'Email sent successfully');
});
