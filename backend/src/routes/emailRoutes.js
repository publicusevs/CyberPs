const express = require('express');
const router = express.Router();

router.post('/test-send', async (req, res) => {
    const { to, subject, text } = req.body;
    
    try {
        // Try to require nodemailer locally to avoid crash if missing
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch (e) {
            return res.status(501).json({ 
                success: false, 
                message: 'Email service is not configured on this server (nodemailer missing).',
                error: e.message 
            });
        }

        // Create a transporter using SMTP settings from env
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.rajasthan.gov.in',
            port: process.env.SMTP_PORT || 465,
            secure: process.env.SMTP_PORT == 465, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
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
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

module.exports = router;
