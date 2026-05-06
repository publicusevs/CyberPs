const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');

router.post('/', authenticate, upload.single('fir_file'), caseController.createCase);
router.get('/', authenticate, caseController.getAllCases);
router.get('/:id', authenticate, caseController.getCaseById);
router.get('/search', authenticate, caseController.searchCases);
router.post('/notes', authenticate, caseController.addNote);
router.post('/:id/status', authenticate, caseController.updateStatus);
router.post('/transaction', authenticate, caseController.addTransaction);
router.put('/:id/profiles', authenticate, caseController.updateProfiles);
router.put('/:id/full', authenticate, upload.single('fir_file'), caseController.updateFullCase);
router.post('/evidence', authenticate, upload.array('evidence_files', 5), caseController.addEvidence);
router.post('/delete-file', authenticate, caseController.deleteFile);
router.post('/save-notice', authenticate, caseController.saveNotice);

module.exports = router;
