const mssql = require('mssql');
require('dotenv').config();

const server = process.env.DB_SERVER || 'localhost';
// Handle both single and double backslashes from .env
const normalizedServer = server.replace('\\\\', '\\');
let [rawHost, instance] = normalizedServer.split('\\');
const host = (rawHost === '.' || rawHost === 'localhost') ? '127.0.0.1' : rawHost;

console.log(`📡 Connection Blueprint: Host=${host}, Port=${process.env.DB_PORT || 'Dynamic'}, Instance=${instance || 'Default'}`);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
    },
};

const poolPromise = new mssql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✔ Connected to MSSQL Database');
        return pool;
    })
    .catch(err => {
        console.error('✘ Database Connection Failed! ', err.message);
        // Do not exit process, so the API server can still serve "Server Error" instead of "Connection Failed"
        return null; 
    });

module.exports = {
    mssql,
    poolPromise
};
