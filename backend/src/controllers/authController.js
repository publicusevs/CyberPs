const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, mssql } = require('../config/db');

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be username, email, or mobile

        const pool = await poolPromise;
        if (!pool) {
            return res.status(503).json({ success: false, message: 'CRITICAL: Database offline. Ensure SQL Server Browser is running.' });
        }

        const result = await pool.request()
            .input('identifier', mssql.NVarChar, identifier)
            .query('SELECT * FROM users WHERE (username = @identifier OR email = @identifier OR mobile = @identifier) AND is_active = 1');

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or account inactive' });
        }

        const user = result.recordset[0];

        if (user.is_locked) {
            return res.status(403).json({ success: false, message: 'Account is locked. Please contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Tokens
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        const refreshToken = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE }
        );

        // Store Session
        await pool.request()
            .input('user_id', mssql.Int, user.user_id)
            .input('token', mssql.NVarChar, token)
            .input('refresh_token', mssql.NVarChar, refreshToken)
            .input('ip_address', mssql.NVarChar, req.ip)
            .input('device_info', mssql.NVarChar, req.headers['user-agent'])
            .query('INSERT INTO login_sessions (user_id, token, refresh_token, ip_address, device_info) VALUES (@user_id, @token, @refresh_token, @ip_address, @device_info)');

        res.json({
            success: true,
            token,
            refreshToken,
            user: {
                user_id: user.user_id,
                name: user.name,
                role: user.role,
                username: user.username
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh Token required' });

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', mssql.Int, decoded.user_id)
            .input('refresh_token', mssql.NVarChar, refreshToken)
            .query('SELECT * FROM login_sessions WHERE user_id = @user_id AND refresh_token = @refresh_token');

        if (result.recordset.length === 0) {
            return res.status(403).json({ message: 'Invalid Refresh Token' });
        }

        const userResult = await pool.request()
            .input('user_id', mssql.Int, decoded.user_id)
            .query('SELECT * FROM users WHERE user_id = @user_id');

        const user = userResult.recordset[0];
        const newToken = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({ success: true, token: newToken });
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired Refresh Token' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const pool = await poolPromise;
        res.json({
            success: true,
            database: !!pool,
            internet: true // If they can reach this, they have some connection to the host
        });
    } catch (err) {
        res.json({ success: true, database: false, internet: true });
    }
};
