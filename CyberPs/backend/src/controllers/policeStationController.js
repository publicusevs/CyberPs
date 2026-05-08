const { poolPromise, mssql } = require('../config/db');

exports.createPoliceStation = async (req, res) => {
    let transaction;
    try {
        const { 
            station_name, station_code, 
            state, district, city, address, is_active 
        } = req.body;
        const { user_id } = req.user;

        const pool = await poolPromise;
        transaction = new mssql.Transaction(pool);
        await transaction.begin();

        // 1. Check if user already has a station mapping
        const mappingCheck = await new mssql.Request(transaction)
            .input('user_id', mssql.Int, user_id)
            .query('SELECT police_station_id FROM user_station_mapping WHERE user_id = @user_id');

        let ps_id;
        if (mappingCheck.recordset.length > 0) {
            // Update existing station
            ps_id = mappingCheck.recordset[0].police_station_id;
            await new mssql.Request(transaction)
                .input('ps_id', mssql.Int, ps_id)
                .input('station_name', mssql.NVarChar, station_name)
                .input('station_code', mssql.NVarChar, station_code)
                .input('state', mssql.NVarChar, state)
                .input('district', mssql.NVarChar, district)
                .input('city', mssql.NVarChar, city)
                .input('address', mssql.NVarChar, address)
                .input('active', mssql.Bit, is_active === undefined ? 1 : is_active)
                .query(`UPDATE police_stations SET 
                    station_name=@station_name, station_code=@station_code, 
                    state=@state, district=@district, city=@city, address=@address, 
                    is_active=@active 
                    WHERE police_station_id = @ps_id`);
        } else {
            // Check for duplicate code globally
            const codeCheck = await new mssql.Request(transaction)
                .input('code', mssql.NVarChar, station_code)
                .query('SELECT 1 FROM police_stations WHERE station_code = @code');

            if (codeCheck.recordset.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Station code already exists' });
            }

            // Create new station
            const insertResult = await new mssql.Request(transaction)
                .input('station_name', mssql.NVarChar, station_name)
                .input('station_code', mssql.NVarChar, station_code)
                .input('state', mssql.NVarChar, state)
                .input('district', mssql.NVarChar, district)
                .input('city', mssql.NVarChar, city)
                .input('address', mssql.NVarChar, address)
                .input('active', mssql.Bit, is_active === undefined ? 1 : is_active)
                .query(`INSERT INTO police_stations 
                    (station_name, station_code, state, district, city, address, is_active) 
                    OUTPUT INSERTED.police_station_id
                    VALUES 
                    (@station_name, @station_code, @state, @district, @city, @address, @active)`);
            
            ps_id = insertResult.recordset[0].police_station_id;

            // Map user to station
            await new mssql.Request(transaction)
                .input('user_id', mssql.Int, user_id)
                .input('ps_id', mssql.Int, ps_id)
                .query('INSERT INTO user_station_mapping (user_id, police_station_id) VALUES (@user_id, @ps_id)');
        }

        await transaction.commit();
        res.json({ success: true, message: 'Station data synchronized successfully', police_station_id: ps_id });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('SQL Error Details:', err);
        res.status(500).json({ success: false, message: 'Process failed', error: err.message });
    }
};

exports.getMyStation = async (req, res) => {
    try {
        let { police_station_id, user_id } = req.user;
        const pool = await poolPromise;

        // Fallback: If token doesn't have PS_ID, check DB mapping
        if (!police_station_id) {
            const mapping = await pool.request()
                .input('uid', mssql.Int, user_id)
                .query('SELECT police_station_id FROM user_station_mapping WHERE user_id = @uid');
            
            if (mapping.recordset.length > 0) {
                police_station_id = mapping.recordset[0].police_station_id;
            }
        }

        if (!police_station_id) {
            return res.status(200).json({ success: true, data: null, message: 'No station mapped' });
        }

        const result = await pool.request()
            .input('id', mssql.Int, police_station_id)
            .query('SELECT * FROM police_stations WHERE police_station_id = @id');

        if (result.recordset.length === 0) {
            return res.status(200).json({ success: true, data: null });
        }

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching station details' });
    }
};

exports.getAllStations = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM police_stations ORDER BY station_name ASC');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching stations' });
    }
};
