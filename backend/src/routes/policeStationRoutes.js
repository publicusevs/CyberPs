const express = require('express');
const router = express.Router();
const policeStationController = require('../controllers/policeStationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/', authenticate, authorize(['Admin']), policeStationController.createPoliceStation);
router.get('/my-station', authenticate, policeStationController.getMyStation);
router.get('/all', authenticate, authorize(['Admin']), policeStationController.getAllStations);

module.exports = router;
