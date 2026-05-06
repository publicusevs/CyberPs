const mssql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: '127.0.0.1',
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function fix() {
    try {
        console.log("Connect to:", config.server, "on port", config.port);
        let pool = await mssql.connect(config);
        const hash = '$2b$10$Ao8BcLS6xnW12BE0hqaQ0OwMeAZVprvSTBXSHz/qL3FpDoivHD/9i';
        await pool.request()
            .input('hash', mssql.NVarChar, hash)
            .query("UPDATE users SET password_hash = @hash WHERE username = 'admin' OR username = 'System Admin'");
        
        console.log("✅ SUCCESS: Admin password has been reset to: admin123");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR:", err.message);
        process.exit(1);
    }
}

fix();
