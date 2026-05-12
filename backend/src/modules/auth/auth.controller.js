/**
 * auth.controller.js — Thin HTTP layer for authentication.
 * Parses request → calls AuthService → sends standardized response.
 * No business logic. No SQL. No try/catch (handled by asyncHandler + errorHandler).
 */

'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess } = require('../../core/responseHelper');
const AuthService = require('./auth.service');

exports.login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const result = await AuthService.login(
        identifier, password,
        req.ip, req.headers['user-agent']
    );
    sendSuccess(res, result, 'Login successful');
});

exports.refreshToken = asyncHandler(async (req, res) => {
    const result = await AuthService.refresh(req.body.refreshToken);
    sendSuccess(res, result, 'Token refreshed');
});

exports.getStatus = asyncHandler(async (req, res) => {
    const result = await AuthService.getStatus();
    sendSuccess(res, result, 'Status retrieved');
});
