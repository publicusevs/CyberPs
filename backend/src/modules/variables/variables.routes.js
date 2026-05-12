'use strict';

const express = require('express');
const router = express.Router();
const variablesController = require('./variables.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/', authenticate, variablesController.getAllVariables);
router.post('/', authenticate, variablesController.upsertVariable);
router.put('/:id', authenticate, variablesController.updateVariable);
router.delete('/:id', authenticate, variablesController.deleteVariable);

module.exports = router;
