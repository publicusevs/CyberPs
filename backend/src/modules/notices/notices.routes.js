'use strict';

const express = require('express');
const router = express.Router();
const noticesController = require('./notices.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/', authenticate, noticesController.saveNotice);
router.get('/case/:id', authenticate, noticesController.getNoticesByCase);
router.get('/:id', authenticate, noticesController.getNoticeDetail);
router.put('/:id', authenticate, noticesController.updateNotice);

module.exports = router;
