const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/', noticeController.saveNotice);
router.get('/case/:id', noticeController.getNoticesByCase);
router.get('/:id', noticeController.getNoticeDetail);
router.put('/:id', noticeController.updateNotice);

module.exports = router;
