'use strict';

const express = require('express');
const router = express.Router();
const trailController = require('./trail.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/fileUpload');

router.get('/case/:case_id', authenticate, trailController.analyzeTrailFromCase);
router.post('/analyze-excel', authenticate, upload.single('excel_file'), trailController.analyzeTrailFromExcel);
router.post('/reanalyze', authenticate, trailController.reanalyzeTrail);

module.exports = router;
