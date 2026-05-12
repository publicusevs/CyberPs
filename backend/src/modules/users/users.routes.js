'use strict';

const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/investigators', authenticate, usersController.getInvestigators);
router.get('/stats', authenticate, usersController.getStats);

module.exports = router;
