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

    // ── 3. Seed global_variables defaults & CUSTOM USER SEEDS ───────────────
    logger.info('[MIGRATE] Seeding global_variables defaults...');
    const VariablesRepository = require('../modules/variables/variables.repository');
    await VariablesRepository.ensureDefaults();

    logger.info('[MIGRATE] Checking for seed_data.json to restore user templates...');
    const fs = require('fs');
    const path = require('path');
    const isPkg = typeof process.pkg !== 'undefined';
    const seedPath = isPkg 
        ? path.join(path.dirname(process.execPath), 'seed_data.json') 
        : path.join(__dirname, '..', '..', 'seed_data.json');
    
    if (fs.existsSync(seedPath)) {
        try {
            const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
            const { mssql } = require('../config/db');
            
            // Restore Templates
            if (seedData.notice_templates && seedData.notice_templates.length > 0) {
                logger.info(`[MIGRATE] Found ${seedData.notice_templates.length} templates to restore.`);
                for (const tpl of seedData.notice_templates) {
                    await pool.request()
                        .input('name', mssql.NVarChar, tpl.template_name)
                        .input('type', mssql.NVarChar, tpl.template_type)
                        .input('subject', mssql.NVarChar, tpl.subject_text)
                        .input('body', mssql.NVarChar, tpl.body_text)
                        .input('footer', mssql.NVarChar, tpl.footer_text)
                        .input('json', mssql.NVarChar, tpl.json_data)
                        .query(`
                            IF NOT EXISTS (SELECT * FROM notice_templates WHERE template_name = @name)
                            BEGIN
                                INSERT INTO notice_templates (template_name, template_type, subject_text, body_text, footer_text, json_data)
                                VALUES (@name, @type, @subject, @body, @footer, @json)
                            END
                        `);
                }
            }

            // Restore Variables
            if (seedData.global_variables && seedData.global_variables.length > 0) {
                logger.info(`[MIGRATE] Found ${seedData.global_variables.length} variables to restore.`);
                for (const vr of seedData.global_variables) {
                    await pool.request()
                        .input('name', mssql.NVarChar, vr.variable_name)
                        .input('val', mssql.NVarChar, vr.variable_value)
                        .input('cat', mssql.NVarChar, vr.category)
                        .query(`
                            IF NOT EXISTS (SELECT * FROM global_variables WHERE variable_name = @name)
                            BEGIN
                                INSERT INTO global_variables (variable_name, variable_value, category)
                                VALUES (@name, @val, @cat)
                            END
                        `);
                }
            }
            logger.info('[MIGRATE] User seed data restoration complete.');
        } catch (e) {
            logger.error('[MIGRATE] Failed to parse/restore seed_data.json: ' + e.message);
        }
    } else {
        logger.info('[MIGRATE] No seed_data.json found. Skipping user template restoration.');
    }


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

    // ── 5. cases — add sections column if missing ─────────────────────────────
    logger.info('[MIGRATE] Checking cases.sections column...');
    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='cases' AND xtype='U')
        BEGIN
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'sections'
            )
            BEGIN
                ALTER TABLE cases ADD sections NVARCHAR(500) NULL
                PRINT 'Added sections column to cases'
            END
        END
    `);

    // ── 6. cases — add sho_name column if missing ─────────────────────────────
    logger.info('[MIGRATE] Checking cases.sho_name column...');
    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='cases' AND xtype='U')
        BEGIN
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'sho_name'
            )
            BEGIN
                ALTER TABLE cases ADD sho_name NVARCHAR(200) NULL
                PRINT 'Added sho_name column to cases'
            END
        END
    `);

    // ── 7. cases — add remarks column if missing ───────────────────────────────
    logger.info('[MIGRATE] Checking cases.remarks column...');
    await pool.request().query(`
        IF EXISTS (SELECT * FROM sysobjects WHERE name='cases' AND xtype='U')
        BEGIN
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'remarks'
            )
            BEGIN
                ALTER TABLE cases ADD remarks NVARCHAR(MAX) NULL
                PRINT 'Added remarks column to cases'
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
