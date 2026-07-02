const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../../ramail/.env');
const banksPath = path.join(__dirname, '../../../../bankmaillist.json');

exports.getMailSettings = (req, res) => {
    try {
        if (!fs.existsSync(envPath)) {
            return res.status(404).json({ error: 'ramail/.env file not found' });
        }
        
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        let settings = {
            EMAIL_USER: '',
            EMAIL_PASSWORD: ''
        };
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                if (key.trim() === 'EMAIL_USER') settings.EMAIL_USER = value;
                if (key.trim() === 'EMAIL_PASSWORD') settings.EMAIL_PASSWORD = value;
            }
        });
        
        res.json(settings);
    } catch (error) {
        console.error('Error reading mail settings:', error);
        res.status(500).json({ error: 'Failed to read mail settings' });
    }
};

exports.updateMailSettings = async (req, res) => {
    try {
        const { EMAIL_USER, EMAIL_PASSWORD } = req.body;
        
        if (!EMAIL_USER || !EMAIL_PASSWORD) {
            return res.status(400).json({ error: 'EMAIL_USER and EMAIL_PASSWORD are required' });
        }
        
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        const lines = envContent.split('\n');
        let updatedLines = [];
        let userFound = false;
        let passFound = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('EMAIL_USER=')) {
                updatedLines.push(`EMAIL_USER=${EMAIL_USER}`);
                userFound = true;
            } else if (line.startsWith('EMAIL_PASSWORD=')) {
                updatedLines.push(`EMAIL_PASSWORD=${EMAIL_PASSWORD}`);
                passFound = true;
            } else if (line.trim() !== '') {
                updatedLines.push(line);
            }
        }
        
        if (!userFound) updatedLines.push(`EMAIL_USER=${EMAIL_USER}`);
        if (!passFound) updatedLines.push(`EMAIL_PASSWORD=${EMAIL_PASSWORD}`);
        
        fs.writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf8');
        
        // Notify ramail service to reload credentials dynamically
        try {
            await fetch('http://localhost:8000/api/v2/mail/reload', { method: 'POST' });
        } catch (fetchErr) {
            console.error('Failed to notify ramail to reload settings:', fetchErr);
        }

        res.json({ message: 'Mail credentials updated successfully' });
    } catch (error) {
        console.error('Error updating mail settings:', error);
        res.status(500).json({ error: 'Failed to update mail settings' });
    }
};

exports.getBanksSettings = (req, res) => {
    try {
        if (!fs.existsSync(banksPath)) {
            return res.json([]);
        }
        
        const rawData = fs.readFileSync(banksPath, 'utf8');
        const banks = JSON.parse(rawData);
        
        res.json(banks);
    } catch (error) {
        console.error('Error reading banks settings:', error);
        res.status(500).json({ error: 'Failed to read banks settings' });
    }
};

exports.updateBanksSettings = (req, res) => {
    try {
        const banks = req.body;
        
        if (!Array.isArray(banks)) {
            return res.status(400).json({ error: 'Banks data must be an array' });
        }
        
        fs.writeFileSync(banksPath, JSON.stringify(banks, null, 4), 'utf8');
        
        res.json({ message: 'Banks list updated successfully' });
    } catch (error) {
        console.error('Error updating banks settings:', error);
        res.status(500).json({ error: 'Failed to update banks settings' });
    }
};
