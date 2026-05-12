'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const DashboardService = require('./dashboard.service');

exports.getStats = asyncHandler(async (req, res) => {
    const result = await DashboardService.getStats(req.user.police_station_id);
    res.json({ success: true, ...result }); // Preserve exact original response shape
});
