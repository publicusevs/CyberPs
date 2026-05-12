/**
 * mail.js — Centralized Nodemailer transporter factory.
 *
 * Creates and caches a configured mail transporter from environment variables.
 * Extracted from emailRoutes.js where it was inline — this prevents re-creating
 * the transporter on every request and isolates SMTP config in one place.
 *
 * Usage:
 *   const { getTransporter, sendMail } = require('../config/mail');
 *   await sendMail({ to, subject, text, html });
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let _transporter = null;

/**
 * Returns (or lazily creates) the shared Nodemailer transporter.
 * @returns {import('nodemailer').Transporter}
 */
const getTransporter = () => {
    if (_transporter) return _transporter;

    _transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    logger.info(`[MAIL] Transporter configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    return _transporter;
};

/**
 * Sends an email using the configured transporter.
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} [options.text]
 * @param {string} [options.html]
 * @param {string} [options.from] - defaults to SMTP_USER
 * @returns {Promise<object>} - Nodemailer send info
 */
const sendMail = async ({ to, subject, text, html, from }) => {
    const transporter = getTransporter();

    const mailOptions = {
        from: from || process.env.SMTP_USER || `"CyberPS System" <no-reply@rajasthan.gov.in>`,
        to,
        subject: subject || 'Notification from CyberPS',
        text,
        html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`[MAIL] Email sent to ${to} | MessageId: ${info.messageId}`);
    return info;
};

module.exports = { getTransporter, sendMail };
