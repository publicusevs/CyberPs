/**
 * police-stations.repository.js — Database access layer for Police Stations.
 */

'use strict';

const { poolPromise, mssql } = require('../../config/db');

const PoliceStationsRepository = {

    async getMappingByUser(transaction, userId) {
        const result = await new mssql.Request(transaction)
            .input('user_id', mssql.Int, userId)
            .query('SELECT police_station_id FROM user_station_mapping WHERE user_id = @user_id');
        return result.recordset[0] || null;
    },

    async checkCodeExists(transaction, stationCode) {
        const result = await new mssql.Request(transaction)
            .input('code', mssql.NVarChar, stationCode)
            .query('SELECT 1 FROM police_stations WHERE station_code = @code');
        return result.recordset.length > 0;
    },

    async insert(transaction, { stationName, stationCode, state, district, city, address, isActive }) {
        const result = await new mssql.Request(transaction)
            .input('station_name', mssql.NVarChar, stationName)
            .input('station_code', mssql.NVarChar, stationCode)
            .input('state', mssql.NVarChar, state)
            .input('district', mssql.NVarChar, district)
            .input('city', mssql.NVarChar, city)
            .input('address', mssql.NVarChar, address)
            .input('active', mssql.Bit, isActive === undefined ? 1 : isActive)
            .query(`INSERT INTO police_stations 
                (station_name, station_code, state, district, city, address, is_active) 
                OUTPUT INSERTED.police_station_id
                VALUES (@station_name, @station_code, @state, @district, @city, @address, @active)`);
        return result.recordset[0].police_station_id;
    },

    async update(transaction, psId, { stationName, stationCode, state, district, city, address, isActive }) {
        await new mssql.Request(transaction)
            .input('ps_id', mssql.Int, psId)
            .input('station_name', mssql.NVarChar, stationName)
            .input('station_code', mssql.NVarChar, stationCode)
            .input('state', mssql.NVarChar, state)
            .input('district', mssql.NVarChar, district)
            .input('city', mssql.NVarChar, city)
            .input('address', mssql.NVarChar, address)
            .input('active', mssql.Bit, isActive === undefined ? 1 : isActive)
            .query(`UPDATE police_stations SET 
                station_name=@station_name, station_code=@station_code, 
                state=@state, district=@district, city=@city, address=@address, 
                is_active=@active 
                WHERE police_station_id = @ps_id`);
    },

    async mapUserToStation(transaction, userId, psId) {
        await new mssql.Request(transaction)
            .input('user_id', mssql.Int, userId)
            .input('ps_id', mssql.Int, psId)
            .query('INSERT INTO user_station_mapping (user_id, police_station_id) VALUES (@user_id, @ps_id)');
    },

    async getById(psId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', mssql.Int, psId)
            .query('SELECT * FROM police_stations WHERE police_station_id = @id');
        return result.recordset[0] || null;
    },

    async getMappedStationByUser(userId) {
        const pool = await poolPromise;
        const mapping = await pool.request()
            .input('uid', mssql.Int, userId)
            .query('SELECT police_station_id FROM user_station_mapping WHERE user_id = @uid');
        return mapping.recordset[0]?.police_station_id || null;
    },

    async getAll() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT 
                    ps.police_station_id, 
                    ps.station_name, 
                    ps.station_code, 
                    ps.state, 
                    ps.district, 
                    ps.city, 
                    ps.address, 
                    ps.is_active,
                    m.district_id 
                FROM police_stations ps
                LEFT JOIN case_station_mapping m ON ps.police_station_id = m.police_station_id
                ORDER BY ps.station_name ASC
            `);
        return result.recordset;
    },

    async getAllDistricts() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM master_districts ORDER BY district_name ASC');
        return result.recordset;
    },

    async getPool() {
        return poolPromise;
    },

    getMssql() {
        return mssql;
    },
};

module.exports = PoliceStationsRepository;
