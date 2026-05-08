const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');

router.post('/', authenticate, transactionController.addTransaction);
router.post('/import', authenticate, upload.single('excel_file'), transactionController.importExcel);
router.get('/search', authenticate, transactionController.searchTransactions);
router.get('/case/:id/flow', authenticate, transactionController.getFundFlowByCaseId);

module.exports = router;
