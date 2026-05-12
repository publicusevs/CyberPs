/**
 * users.service.js — Business logic for User management.
 */

'use strict';

const UsersRepository = require('./users.repository');

const UsersService = {

    async getInvestigators() {
        return UsersRepository.getInvestigators();
    },

    async getStats() {
        return UsersRepository.getStats();
    },
};

module.exports = UsersService;
