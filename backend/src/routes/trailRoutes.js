const express = require('express');
const router = express.Router();
const trailController = require('../controllers/trailController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');

// Case-linked: fetch trail from DB transactions
router.get('/case/:case_id', authenticate, trailController.analyzeTrailFromCase);

// Standalone: upload Excel → get trail instantly (no DB storage)
router.post('/analyze-excel', authenticate, upload.single('excel_file'), trailController.analyzeTrailFromExcel);

// Re-analyze with new filter params
router.post('/reanalyze', authenticate, trailController.reanalyzeTrail);

module.exports = router;
