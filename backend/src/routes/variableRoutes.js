const express = require('express');
const router = express.Router();
const variableController = require('../controllers/variableController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', variableController.getAllVariables);
router.post('/', variableController.upsertVariable);
router.put('/:id', variableController.updateVariable);
router.delete('/:id', variableController.deleteVariable);

module.exports = router;
