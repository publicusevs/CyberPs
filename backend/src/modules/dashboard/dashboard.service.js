/**
 * dashboard.service.js — Business logic for Dashboard stats.
 */

'use strict';

const DashboardRepository = require('./dashboard.repository');

const DashboardService = {
    async getStats(policeStationId) {
        return DashboardRepository.getStats(policeStationId);
    },
};

module.exports = DashboardService;
