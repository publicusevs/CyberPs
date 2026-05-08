const express = require('express');
const router = express.Router();
const variableController = require('../controllers/variableController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', variableController.getAllVariables);
router.post('/', variableController.upsertVariable);
router.delete('/:id', variableController.deleteVariable);

module.exports = router;
