const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/investigators', authenticate, userController.getInvestigators);
router.get('/stats', authenticate, userController.getStats);

module.exports = router;
