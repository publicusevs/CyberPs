/**
 * templates.service.js — Business logic for Notice Templates.
 *
 * NOTE: The table DDL (ensureTableExists) that was previously called on EVERY
 * API request has been removed. The table is now created by: npm run migrate
 * (see src/scripts/migrate.js). This prevents DDL execution on the hot path.
 */

'use strict';

const TemplatesRepository = require('./templates.repository');
const AppError = require('../../core/AppError');

const TemplatesService = {

    async getAll() {
        return TemplatesRepository.getAll();
    },

    async getById(id) {
        const template = await TemplatesRepository.getById(id);
        if (!template) throw new AppError('Template not found', 404);
        return template;
    },

    async create({ template_name, template_type, subject_text, body_text, footer_text, json_data }) {
        await TemplatesRepository.insert({
            templateName: template_name,
            templateType: template_type,
            subjectText: subject_text,
            bodyText: body_text,
            footerText: footer_text,
            jsonData: json_data,
        });
    },

    async update(id, { template_name, template_type, subject_text, body_text, footer_text, json_data }) {
        await TemplatesRepository.update(id, {
            templateName: template_name,
            templateType: template_type,
            subjectText: subject_text,
            bodyText: body_text,
            footerText: footer_text,
            jsonData: json_data,
        });
    },

    async remove(id) {
        await TemplatesRepository.remove(id);
    },
};

module.exports = TemplatesService;
