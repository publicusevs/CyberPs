const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, mssql } = require('../config/db');

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('identifier', mssql.NVarChar, identifier)
            .query(`
                SELECT u.*, usm.police_station_id, ps.station_name, ps.station_code 
                FROM users u
                LEFT JOIN user_station_mapping usm ON u.user_id = usm.user_id
                LEFT JOIN police_stations ps ON usm.police_station_id = ps.police_station_id
                WHERE (u.username = @identifier OR u.email = @identifier OR u.mobile = @identifier) 
                AND u.is_active = 1
            `);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Tokens
        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                role: user.role,
                police_station_id: user.police_station_id,
                station_name: user.station_name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        const refreshToken = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE }
        );

        // Optional: Save refresh token in DB
        await pool.request()
            .input('user_id', mssql.Int, user.user_id)
            .input('token', mssql.NVarChar, token)
            .input('refresh_token', mssql.NVarChar, refreshToken)
            .input('ip_address', mssql.NVarChar, req.ip)
            .input('device_info', mssql.NVarChar, req.headers['user-agent'])
            .query('INSERT INTO login_sessions (user_id, token, refresh_token, ip_address, device_info) VALUES (@user_id, @token, @refresh_token, @ip_address, @device_info)');

        // Prepare User Data (exclude sensitive fields)
        const { password_hash, ...userData } = user;

        res.json({
            success: true,
            token,
            refreshToken,
            user: userData
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('user_id', mssql.Int, decoded.user_id)
            .query('SELECT u.*, usm.police_station_id, ps.station_name FROM users u LEFT JOIN user_station_mapping usm ON u.user_id = usm.user_id LEFT JOIN police_stations ps ON usm.police_station_id = ps.police_station_id WHERE u.user_id = @user_id AND u.is_active = 1');

        const user = result.recordset[0];
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const newToken = jwt.sign(
            { 
                user_id: user.user_id, 
                role: user.role,
                police_station_id: user.police_station_id,
                station_name: user.station_name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({ success: true, token: newToken });

    } catch (err) {
        res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const pool = await poolPromise;
        if (!pool) {
            return res.json({ success: true, database: false, error: 'Database pool is null', internet: true });
        }
        
        // Live health check query
        await pool.request().query('SELECT 1');
        
        res.json({
            success: true,
            database: true,
            internet: true
        });
    } catch (err) {
        console.error('Status Check Error:', err.message);
        res.json({ success: true, database: false, error: err.message, internet: true });
    }
};
