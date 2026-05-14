'use strict';

const express = require('express');
const router = express.Router();
const templatesController = require('../modules/templates/templates.controller');
const { requireAuth } = require('../middleware/authHandler');

router.use(requireAuth);

// Global Variables
router.get('/', templatesController.getAllVariables);
router.post('/', templatesController.createVariable);
router.put('/:id', templatesController.updateVariable);
router.delete('/:id', templatesController.deleteVariable);

module.exports = router;
