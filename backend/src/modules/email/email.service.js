/**
 * email.service.js — Business logic for email sending.
 *
 * Extracted from emailRoutes.js where SMTP config was inline.
 * Uses the centralized mail.js transporter factory.
 */

'use strict';

const { sendMail } = require('../../config/mail');
const AppError = require('../../core/AppError');

const EmailService = {

    /**
     * Send a test email.
     * @param {object} params
     * @param {string} params.to
     * @param {string} params.subject
     * @param {string} params.text
     * @returns {Promise<{messageId: string}>}
     */
    async sendTestEmail({ to, subject, text }) {
        if (!to) throw new AppError('Recipient email (to) is required', 400);

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new AppError(
                'Email service is not configured. Set SMTP_USER and SMTP_PASS in .env',
                501
            );
        }

        const info = await sendMail({
            to,
            subject: subject || 'Test Email from CyberPS',
            text: text || 'This is a test email sent from the CyberPS system.',
        });

        return { messageId: info.messageId };
    },

    /**
     * Send a forensic notice email to a bank nodal officer.
     * @param {object} params
     */
    async sendNoticeEmail({ to, subject, html, text }) {
        if (!to) throw new AppError('Recipient email (to) is required', 400);

        const info = await sendMail({ to, subject, html, text });
        return { messageId: info.messageId };
    },
};

module.exports = EmailService;
