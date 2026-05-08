const mssql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER === 'localhost' ? '127.0.0.1' : process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

console.log("Testing with:", dbConfig);

mssql.connect(dbConfig).then(() => {
    console.log("✅ SUCCESS: Connection established!");
    process.exit(0);
}).catch(err => {
    console.error("❌ FAILED:", err.message);
    process.exit(1);
});
