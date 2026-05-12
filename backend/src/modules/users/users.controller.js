'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const UsersService = require('./users.service');

exports.getInvestigators = asyncHandler(async (req, res) => {
    const data = await UsersService.getInvestigators();
    sendSuccess(res, data);
});

exports.getStats = asyncHandler(async (req, res) => {
    const result = await UsersService.getStats();
    res.json({ success: true, ...result }); // Preserve original flat shape
});
