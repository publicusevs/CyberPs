const mssql = require('mssql');
require('dotenv').config({ path: './backend/.env' });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
    },
};

console.log('Testing connection with config:', { ...dbConfig, password: '***' });

mssql.connect(dbConfig)
    .then(pool => {
        console.log('SUCCESS: Connected to database');
        return pool.request().query('SELECT 1 as result');
    })
    .then(result => {
        console.log('QUERY SUCCESS:', result.recordset);
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE:', err.message);
        process.exit(1);
    });
