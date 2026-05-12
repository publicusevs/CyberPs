/**
 * auth.routes.js — Route definitions for /api/auth
 * Identical paths to original authRoutes.js — zero breaking changes.
 */

'use strict';

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/status', authController.getStatus);

module.exports = router;
