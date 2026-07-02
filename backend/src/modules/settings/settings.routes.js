const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');

// Mail Settings
router.get('/mail', settingsController.getMailSettings);
router.post('/mail', settingsController.updateMailSettings);

// Banks Settings
router.get('/banks', settingsController.getBanksSettings);
router.post('/banks', settingsController.updateBanksSettings);

module.exports = router;
