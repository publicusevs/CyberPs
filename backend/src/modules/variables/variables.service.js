/**
 * variables.service.js — Business logic for Global Variables (protocol registry).
 */

'use strict';

const VariablesRepository = require('./variables.repository');

const VariablesService = {

    async getAll() {
        return VariablesRepository.getAll();
    },

    async upsert({ variable_name, variable_value, category }) {
        await VariablesRepository.upsert({ variableName: variable_name, variableValue: variable_value, category });
    },

    async update(id, { variable_name, variable_value, category }) {
        await VariablesRepository.update(id, { variableName: variable_name, variableValue: variable_value, category });
    },

    async remove(id) {
        await VariablesRepository.remove(id);
    },
};

module.exports = VariablesService;
