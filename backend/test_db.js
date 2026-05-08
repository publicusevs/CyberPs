const mssql = require('mssql');
require('dotenv').config();

console.log("--- Environment Audit ---");
console.log("DB_USER:", process.env.DB_USER ? "FOUND" : "MISSING");
console.log("DB_SERVER:", process.env.DB_SERVER || "MISSING");
console.log("DB_NAME:", process.env.DB_NAME || "MISSING");
console.log("DB_PORT:", process.env.DB_PORT || "1433 (Default)");

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER === 'localhost' ? '127.0.0.1' : process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000
    }
};

console.log("\n--- Connection Attempt ---");
console.log("Attempting to connect to:", dbConfig.server);

mssql.connect(dbConfig).then(() => {
    console.log("✅ SUCCESS: Connection established!");
    process.exit(0);
}).catch(err => {
    console.error("❌ FAILED:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.stack) console.error("Stack:", err.stack);
    process.exit(1);
});
