/**
 * templates.repository.js — Database access layer for Notice Templates.
 *
 * IMPORTANT: The ensureTableExists DDL check has been removed from every
 * request and moved to a one-time startup migration (src/scripts/migrate.js).
 * This prevents DDL execution on every API call — a major performance issue.
 *
 * The table must exist before the API is used. Run: npm run migrate
 */

'use strict';

const { poolPromise } = require('../../config/db');

const TemplatesRepository = {

    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM notice_templates ORDER BY created_at DESC');
        return result.recordset;
    },

    async getById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', id)
            .query('SELECT * FROM notice_templates WHERE template_id = @id');
        return result.recordset[0] || null;
    },

    async insert({ templateName, templateType, subjectText, bodyText, footerText, jsonData }) {
        const pool = await poolPromise;
        const finalJsonData = jsonData || { fields: [], table_columns: [], mapping: {} };
        await pool.request()
            .input('name', templateName)
            .input('type', templateType || 'Standard')
            .input('subject', subjectText || '')
            .input('body', bodyText || '')
            .input('footer', footerText || '')
            .input('json', JSON.stringify(finalJsonData))
            .query(`INSERT INTO notice_templates (template_id, template_name, template_type, subject_text, body_text, footer_text, json_data)
                    VALUES (NEWID(), @name, @type, @subject, @body, @footer, @json)`);
    },

    async update(id, { templateName, templateType, subjectText, bodyText, footerText, jsonData }) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .input('name', templateName)
            .input('type', templateType || 'Standard')
            .input('subject', subjectText || '')
            .input('body', bodyText || '')
            .input('footer', footerText || '')
            .input('json', jsonData ? JSON.stringify(jsonData) : null)
            .query(`UPDATE notice_templates 
                SET template_name = @name, template_type = @type, subject_text = @subject, 
                    body_text = @body, footer_text = @footer, json_data = @json, updated_at = GETDATE()
                WHERE template_id = @id`);
    },

    async remove(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .query('DELETE FROM notice_templates WHERE template_id = @id');
    },
};

module.exports = TemplatesRepository;
