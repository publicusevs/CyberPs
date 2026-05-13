/**
 * cases.routes.js — Routes for /api/cases
 * All paths IDENTICAL to original caseRoutes.js — zero breaking changes.
 *
 * NOTE: /api/cases/transaction (duplicate addTransaction from caseController)
 * is now wired to the canonical TransactionsController.addTransaction.
 * The behavior is identical — same DB table, better field coverage (platform).
 */

'use strict';

const express = require('express');
const router = express.Router();
const casesController = require('./cases.controller');
// Canonical transaction handler (has platform field — matches full DB schema)
const transactionsController = require('../transactions/transactions.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/fileUpload');

router.post('/register', authenticate, upload.single('fir_file'), casesController.register);
router.post('/', authenticate, upload.single('fir_file'), casesController.createCase);
router.get('/', authenticate, casesController.getAllCases);
router.get('/search', authenticate, casesController.searchCases);
router.get('/:id', authenticate, casesController.getCaseById);
router.post('/:id/notes', authenticate, casesController.addNote);
router.post('/:id/status', authenticate, casesController.updateStatus);
// Redirect to canonical addTransaction (same endpoint, better implementation)
router.post('/transaction', authenticate, transactionsController.addTransaction);
router.put('/:id/profiles', authenticate, casesController.updateProfiles);
router.put('/:id/full', authenticate, upload.single('fir_file'), casesController.updateFullCase);
router.post('/evidence', authenticate, upload.array('evidence_files', 5), casesController.addEvidence);
router.post('/delete-file', authenticate, casesController.deleteFile);
router.post('/save-notice', authenticate, casesController.saveNotice);
router.get('/:id/nodal-recipients', authenticate, casesController.getNodalRecipients);
router.get('/:id/nodal-recipient', authenticate, casesController.getNodalRecipients); // Fallback
router.post('/:id/send-nodal-emails', authenticate, casesController.sendNodalEmails);

module.exports = router;
