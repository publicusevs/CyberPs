'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const PoliceStationsService = require('./police-stations.service');

exports.createPoliceStation = asyncHandler(async (req, res) => {
    const { station_name, station_code, state, district, city, address, is_active } = req.body;
    const result = await PoliceStationsService.syncStation(req.user, {
        stationName: station_name, stationCode: station_code,
        state, district, city, address, isActive: is_active,
    });
    sendSuccess(res, result, 'Station data synchronized successfully');
});

exports.getMyStation = asyncHandler(async (req, res) => {
    const data = await PoliceStationsService.getMyStation(req.user);
    sendSuccess(res, data, data ? 'Station retrieved' : 'No station mapped');
});

exports.getAllStations = asyncHandler(async (req, res) => {
    const data = await PoliceStationsService.getAllStations();
    sendSuccess(res, data);
});

exports.getAllDistricts = asyncHandler(async (req, res) => {
    const data = await PoliceStationsService.getAllDistricts();
    sendSuccess(res, data);
});
