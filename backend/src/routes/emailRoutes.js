const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/test-send', async (req, res) => {
    const { to, subject, text } = req.body;
    
    try {
        // Create a transporter using SMTP settings from env
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.rajasthan.gov.in',
            port: process.env.SMTP_PORT || 465,
            secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false // Sometimes needed for government servers
            }
        });

        // Send mail
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER || '"CyberPS System" <no-reply@rajasthan.gov.in>',
            to: to,
            subject: subject || 'Test Email from CyberPS',
            text: text || 'This is a test email sent from the CyberPS local development environment.'
        });

        res.json({ success: true, message: 'Email sent successfully', messageId: info.messageId });
    } catch (error) {
        console.error('Email send error:', error);
        
        // Log to file for debugging
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../../email_error.log');
        const logData = `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n\n`;
        fs.appendFileSync(logPath, logData);

        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message, details: error.toString() });
    }
});

module.exports = router;
