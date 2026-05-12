'use strict';

const express = require('express');
const router = express.Router();
const emailController = require('./email.controller');

// Note: email test route is unauthenticated for testing convenience
// In production, add authenticate middleware here
router.post('/test-send', emailController.sendTestEmail);

module.exports = router;
