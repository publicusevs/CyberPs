const mssql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const server = process.env.DB_SERVER || 'localhost';
// Handle both single and double backslashes from .env
const normalizedServer = server.replace('\\\\', '\\');
let [rawHost, instance] = normalizedServer.split('\\');
const host = (rawHost === '.' || rawHost === 'localhost') ? '127.0.0.1' : rawHost;

console.log(`📡 Connection Blueprint: Host=${host}, Port=${process.env.DB_PORT || 'Dynamic'}, Instance=${instance || 'Default'}`);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: server, // Use the parsed variable which has a fallback
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
    database: process.env.DB_NAME,
    pool: {
        max: 50,
        min: 2,
        idleTimeoutMillis: 30000
    },
    requestTimeout: 60000,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
    },
};

let globalPoolInstance = null;

const poolPromise = {
    then: async function(resolve, reject) {
        if (globalPoolInstance) {
            return resolve(globalPoolInstance);
        }
        try {
            const pool = new mssql.ConnectionPool(dbConfig);
            globalPoolInstance = await pool.connect();
            console.log('✔ Connected to MSSQL Database');
            resolve(globalPoolInstance);
        } catch (err) {
            console.error('✘ Database Connection Failed! ', err.message);
            globalPoolInstance = null;
            reject(err);
        }
    }
};

module.exports = {
    mssql,
    poolPromise
};
