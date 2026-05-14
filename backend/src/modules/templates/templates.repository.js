'use strict';

const { poolPromise, mssql } = require('../../config/db');

const TemplatesRepository = {
    // ---- TEMPLATES ----
    async getAllTemplates() {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM templates ORDER BY updated_at DESC');
        return result.recordset;
    },

    async getTemplateById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query('SELECT * FROM templates WHERE template_id = @id');
        return result.recordset[0];
    },

    async createTemplate(data) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', mssql.NVarChar, data.template_name)
            .input('type', mssql.NVarChar, data.template_type || 'Standard')
            .input('subject', mssql.NVarChar, data.subject_text || '')
            .input('body', mssql.NVarChar, data.body_text || '')
            .input('footer', mssql.NVarChar, data.footer_text || '')
            .input('json', mssql.NVarChar, typeof data.json_data === 'string' ? data.json_data : JSON.stringify(data.json_data || {}))
            .query(`
                INSERT INTO templates (template_name, template_type, subject_text, body_text, footer_text, json_data, created_at, updated_at)
                OUTPUT INSERTED.template_id
                VALUES (@name, @type, @subject, @body, @footer, @json, GETDATE(), GETDATE())
            `);
        return result.recordset[0].template_id;
    },

    async updateTemplate(id, data) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', mssql.Int, id)
            .input('name', mssql.NVarChar, data.template_name)
            .input('type', mssql.NVarChar, data.template_type || 'Standard')
            .input('subject', mssql.NVarChar, data.subject_text || '')
            .input('body', mssql.NVarChar, data.body_text || '')
            .input('footer', mssql.NVarChar, data.footer_text || '')
            .input('json', mssql.NVarChar, typeof data.json_data === 'string' ? data.json_data : JSON.stringify(data.json_data || {}))
            .query(`
                UPDATE templates 
                SET template_name = @name, template_type = @type, subject_text = @subject, 
                    body_text = @body, footer_text = @footer, json_data = @json, updated_at = GETDATE()
                WHERE template_id = @id
            `);
    },

    async deleteTemplate(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', mssql.Int, id)
            .query('DELETE FROM templates WHERE template_id = @id');
    },

    // ---- GLOBAL VARIABLES ----
    async getAllVariables() {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM global_variables ORDER BY variable_name ASC');
        return result.recordset;
    },

    async createVariable(data) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', mssql.NVarChar, data.variable_name)
            .input('value', mssql.NVarChar, data.variable_value)
            .input('desc', mssql.NVarChar, data.description || '')
            .query(`
                INSERT INTO global_variables (variable_name, variable_value, description)
                OUTPUT INSERTED.variable_id
                VALUES (@name, @value, @desc)
            `);
        return result.recordset[0].variable_id;
    },

    async updateVariable(id, data) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', mssql.Int, id)
            .input('name', mssql.NVarChar, data.variable_name)
            .input('value', mssql.NVarChar, data.variable_value)
            .input('desc', mssql.NVarChar, data.description || '')
            .query(`
                UPDATE global_variables 
                SET variable_name = @name, variable_value = @value, description = @desc
                WHERE variable_id = @id
            `);
    },

    async deleteVariable(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', mssql.Int, id)
            .query('DELETE FROM global_variables WHERE variable_id = @id');
    }
};

module.exports = TemplatesRepository;
