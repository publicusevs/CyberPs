/**
 * police-stations.service.js — Business logic for Police Station management.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');
const PoliceStationsRepository = require('./police-stations.repository');
const AppError = require('../../core/AppError');

const PoliceStationsService = {

    /**
     * Create or update a police station and map the requesting user to it.
     * Uses a transaction to ensure atomicity.
     */
    async syncStation(user, stationData) {
        const pool = await poolPromise;
        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            const existingMapping = await PoliceStationsRepository.getMappingByUser(transaction, user.user_id);
            let psId;

            if (existingMapping) {
                // Update existing station
                psId = existingMapping.police_station_id;
                await PoliceStationsRepository.update(transaction, psId, stationData);
            } else {
                // Check for duplicate station code
                const codeExists = await PoliceStationsRepository.checkCodeExists(transaction, stationData.stationCode);
                if (codeExists) {
                    await transaction.rollback();
                    throw new AppError('Station code already exists', 400);
                }

                // Insert new station
                psId = await PoliceStationsRepository.insert(transaction, stationData);

                // Map user → station
                await PoliceStationsRepository.mapUserToStation(transaction, user.user_id, psId);
            }

            await transaction.commit();
            return { police_station_id: psId };

        } catch (err) {
            if (transaction) {
                try { await transaction.rollback(); } catch (rbErr) { /* ignore */ }
            }
            throw err;
        }
    },

    async getMyStation(user) {
        let psId = user.police_station_id;

        // Fallback: token might not have ps_id if assigned after login
        if (!psId) {
            psId = await PoliceStationsRepository.getMappedStationByUser(user.user_id);
        }

        if (!psId) return null;

        return PoliceStationsRepository.getById(psId);
    },

    async getAllStations() {
        return PoliceStationsRepository.getAll();
    },

    async getAllDistricts() {
        return PoliceStationsRepository.getAllDistricts();
    },
};

module.exports = PoliceStationsService;
