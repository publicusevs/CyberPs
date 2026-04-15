require('dotenv').config({ path: './.env' });
const { mssql, poolPromise } = require('./src/config/db');

async function createAccusedTable() {
    try {
        const pool = await poolPromise;
        const query = `
            CREATE TABLE case_accused (
                accused_id INT PRIMARY KEY IDENTITY(1,1),
                case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
                name NVARCHAR(100),
                alias NVARCHAR(100),
                mobile NVARCHAR(50),
                whatsapp_no NVARCHAR(50),
                gmail_id NVARCHAR(100),
                facebook_id NVARCHAR(100),
                twitter_id NVARCHAR(100),
                linkedin_id NVARCHAR(100),
                insta_id NVARCHAR(100),
                telegram_id NVARCHAR(100),
                website_url NVARCHAR(255),
                other_social NVARCHAR(255),
                created_at DATETIME DEFAULT GETDATE()
            );
        `;
        await pool.request().query(query);
        console.log('Successfully created case_accused table.');
    } catch (e) {
        console.error('Error or already created:', e.message);
    } finally {
        process.exit(0);
    }
}
createAccusedTable();
