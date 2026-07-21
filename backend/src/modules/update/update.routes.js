'use strict';

/**
 * update.routes.js
 * Registers all /api/update/* endpoints.
 */

const express = require('express');
const router = express.Router();
const controller = require('./update.controller');

// GET  /api/update/version           — current installed version
router.get('/version', controller.getVersion);

// GET  /api/update/check             — check GitHub for newer version
router.get('/check', controller.checkUpdate);

// POST /api/update/download          — start background download
router.post('/download', controller.downloadUpdate);

// GET  /api/update/progress/:id      — poll download progress
router.get('/progress/:downloadId', controller.getProgress);

// POST /api/update/install           — launch updater.exe and exit
router.post('/install', controller.installUpdate);

// GET  /api/update/log/:logType       — read installer/updater log contents
router.get('/log/:logType', controller.viewLog);

// POST /api/update/open-folder       — open local update temp folder
router.post('/open-folder', controller.openDownloadFolder);

module.exports = router;
