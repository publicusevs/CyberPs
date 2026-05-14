'use strict';

const express = require('express');
const router = express.Router();
const templatesController = require('../modules/templates/templates.controller');
const { requireAuth } = require('../middleware/authHandler');

router.use(requireAuth);

// Templates
router.get('/', templatesController.getAllTemplates);
router.get('/:id', templatesController.getTemplateById);
router.post('/', templatesController.createTemplate);
router.put('/:id', templatesController.updateTemplate);
router.delete('/:id', templatesController.deleteTemplate);

module.exports = router;
