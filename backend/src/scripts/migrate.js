/**
 * migrate.js — Safe one-time database migration script.
 *
 * Purpose: Ensures tables and seed data exist without running DDL on every API call.
 * Run with: npm run migrate
 *
 * SAFETY RULES (strictly enforced):
 * ✅ Only uses IF NOT EXISTS checks
 * ✅ Never drops existing tables
 * ✅ Never alters existing column definitions
 * ✅ Only adds missing columns (IF NOT EXISTS)
 * ✅ Only inserts missing seed rows (IF NOT EXISTS per row)
 * ❌ NEVER uses DROP TABLE, ALTER COLUMN, or TRUNCATE
 */

'use strict';

require('dotenv').config();
require('../config/env');

const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

async function migrate() {
    logger.info('[MIGRATE] Starting safe migration...');
    const pool = await poolPromise;
    if (!pool) {
        logger.error('[MIGRATE] Cannot connect to database. Aborting.');
        process.exit(1);
    }

    // ── 1. notice_templates table ─────────────────────────────────────────────
    logger.info('[MIGRATE] Checking notice_templates table...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notice_templates' AND xtype='U')
        BEGIN
            CREATE TABLE notice_templates (
                template_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                template_name NVARCHAR(150) NOT NULL UNIQUE,
                template_type NVARCHAR(50) DEFAULT 'Standard',
                subject_text NVARCHAR(MAX),
                body_text NVARCHAR(MAX),
                footer_text NVARCHAR(MAX),
                json_data NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
            PRINT 'Created notice_templates table'
        END
    `);

    // Add json_data column if missing (safe ALTER ADD — never drops)
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'notice_templates' AND COLUMN_NAME = 'json_data'
        )
        BEGIN
            ALTER TABLE notice_templates ADD json_data NVARCHAR(MAX)
            PRINT 'Added json_data column to notice_templates'
        END
    `);

    // ── 2. global_variables table ─────────────────────────────────────────────
    logger.info('[MIGRATE] Checking global_variables table...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='global_variables' AND xtype='U')
        BEGIN
            CREATE TABLE global_variables (
                variable_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                variable_name NVARCHAR(100) NOT NULL UNIQUE,
                variable_value NVARCHAR(MAX),
                category NVARCHAR(50) DEFAULT 'General',
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
            PRINT 'Created global_variables table'
        END
    `);

    // ── 3. Seed global_variables defaults ────────────────────────────────────
    logger.info('[MIGRATE] Seeding global_variables defaults...');
    const VariablesRepository = require('../modules/variables/variables.repository');
    await VariablesRepository.ensureDefaults();

    // ── 4. police_stations — add is_active column if missing ──────────────────
    logger.info('[MIGRATE] Checking police_stations.is_active column...');
    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='police_stations' AND xtype='U')
        BEGIN
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'police_stations' AND COLUMN_NAME = 'is_active'
            )
            BEGIN
                ALTER TABLE police_stations ADD is_active BIT DEFAULT 1
                PRINT 'Added is_active column to police_stations'
            END
        END
    `);

    logger.info('[MIGRATE] ✔ Migration complete. All tables verified.');
    process.exit(0);
}

migrate().catch((err) => {
    logger.error('[MIGRATE] Fatal error:', err);
    process.exit(1);
});
