'use strict';

const express = require('express');
const router = express.Router();
const templatesController = require('./templates.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/', authenticate, templatesController.getAllTemplates);
router.get('/:id', authenticate, templatesController.getTemplateById);
router.post('/', authenticate, templatesController.createTemplate);
router.put('/:id', authenticate, templatesController.updateTemplate);
router.delete('/:id', authenticate, templatesController.deleteTemplate);

module.exports = router;
