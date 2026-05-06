require('dotenv').config({ path: './backend/.env' });
const { mssql, poolPromise } = require('./backend/src/config/db');

async function alterTable() {
    try {
        const pool = await poolPromise;
        const query = `
            ALTER TABLE cases ADD
            whatsapp_no NVARCHAR(50),
            gmail_id NVARCHAR(100),
            facebook_id NVARCHAR(100),
            twitter_id NVARCHAR(100),
            linkedin_id NVARCHAR(100),
            insta_id NVARCHAR(100),
            telegram_id NVARCHAR(100),
            website_url NVARCHAR(255),
            other_social NVARCHAR(255);
        `;
        await pool.request().query(query);
        console.log('Successfully altered cases table.');
    } catch (e) {
        console.error('Error or already altered:', e.message);
    } finally {
        process.exit(0);
    }
}
alterTable();
