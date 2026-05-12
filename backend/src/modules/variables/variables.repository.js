/**
 * variables.repository.js — Database access layer for Global Variables.
 *
 * IMPORTANT: ensureTableExists DDL removed from hot path.
 * The global_variables table is created by: npm run migrate
 *
 * Default seeding also moved to migrate script (runs IF NOT EXISTS per row).
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

// Default variables to ensure exist on first use
// Moved here from the controller for reuse in migration script
const DEFAULT_VARIABLES = [
    ['Police_Station_Name', 'Cyber Crime Police Station', 'Department'],
    ['Police_Station_Address', 'BKC, Bandra East, Mumbai, 400051', 'Department'],
    ['Police_Station_Phone', '022-26504000', 'Department'],
    ['District_Name', 'Mumbai City', 'Department'],
    ['State_Name', 'Maharashtra', 'Department'],
    ['Investigating_Officer', 'Inspector Rajesh Kumar', 'Officer'],
    ['IO_Designation', 'Inspector of Police', 'Officer'],
    ['IO_Contact', '9876543210', 'Officer'],
    ['IO_Mobile', '9876543210', 'Officer'],
    ['Bank_Name', 'State Bank of India', 'Bank'],
    ['Branch_Name', 'Main Branch', 'Bank'],
    ['IFSC_Code', 'SBIN0001234', 'Bank'],
    ['Court_Name', 'Special Cyber Court, Mumbai', 'Legal'],
    ['Court_Location', 'Esplanade, Mumbai', 'Legal'],
];

const VariablesRepository = {

    DEFAULT_VARIABLES,

    /**
     * Ensure default variables exist (runs at startup via migrate.js).
     * Safe: uses IF NOT EXISTS per row, NEVER drops or alters existing data.
     */
    async ensureDefaults() {
        const pool = await poolPromise;
        const systemDate = new Date().toLocaleDateString('en-GB');
        const allDefaults = [
            ...DEFAULT_VARIABLES,
            ['System_Date', systemDate, 'System'],
        ];
        for (const [name, value, category] of allDefaults) {
            await pool.request()
                .input('name', name)
                .input('value', value)
                .input('category', category)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM global_variables WHERE variable_name = @name)
                    BEGIN
                        INSERT INTO global_variables (variable_name, variable_value, category)
                        VALUES (@name, @value, @category)
                    END
                `);
        }
    },

    async getAll() {
        const pool = await poolPromise;
        // Refresh System_Date on each fetch
        const today = new Date().toLocaleDateString('en-GB');
        await pool.request()
            .input('name', 'System_Date')
            .input('value', today)
            .input('category', 'System')
            .query(`
                IF NOT EXISTS (SELECT 1 FROM global_variables WHERE variable_name = @name)
                BEGIN
                    INSERT INTO global_variables (variable_name, variable_value, category) VALUES (@name, @value, @category)
                END
                ELSE
                BEGIN
                    UPDATE global_variables SET variable_value = @value WHERE variable_name = @name
                END
            `);
        const result = await pool.request()
            .query('SELECT * FROM global_variables ORDER BY variable_name ASC');
        return result.recordset;
    },

    async upsert({ variableName, variableValue, category }) {
        const pool = await poolPromise;
        await pool.request()
            .input('name', variableName)
            .input('value', variableValue)
            .input('category', category || 'General')
            .query(`
                IF EXISTS (SELECT 1 FROM global_variables WHERE variable_name = @name)
                BEGIN
                    UPDATE global_variables SET variable_value = @value, category = @category, updated_at = GETDATE()
                    WHERE variable_name = @name
                END
                ELSE
                BEGIN
                    INSERT INTO global_variables (variable_name, variable_value, category) VALUES (@name, @value, @category)
                END
            `);
    },

    async update(id, { variableName, variableValue, category }) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .input('name', variableName)
            .input('value', variableValue)
            .input('category', category || 'General')
            .query('UPDATE global_variables SET variable_name = @name, variable_value = @value, category = @category, updated_at = GETDATE() WHERE variable_id = @id');
    },

    async remove(id) {
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .query('DELETE FROM global_variables WHERE variable_id = @id');
    },
};

module.exports = VariablesRepository;
