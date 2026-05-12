'use strict';

const express = require('express');
const router = express.Router();
const transactionsController = require('./transactions.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/fileUpload');

router.post('/', authenticate, transactionsController.addTransaction);
router.post('/import', authenticate, upload.single('excel_file'), transactionsController.importExcel);
router.get('/search', authenticate, transactionsController.searchTransactions);
router.get('/case/:id/flow', authenticate, transactionsController.getFundFlowByCaseId);

module.exports = router;
