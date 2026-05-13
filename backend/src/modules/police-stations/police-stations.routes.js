'use strict';

const express = require('express');
const router = express.Router();
const policeStationsController = require('./police-stations.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/', authenticate, policeStationsController.createPoliceStation);
router.get('/my-station', authenticate, policeStationsController.getMyStation);
router.get('/districts', authenticate, policeStationsController.getAllDistricts);
router.get('/', authenticate, policeStationsController.getAllStations);

module.exports = router;
