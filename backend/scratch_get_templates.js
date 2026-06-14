require('dotenv').config();
const mssql = require('mssql');
const config = {user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_SERVER, database: process.env.DB_NAME, options: {encrypt: false, trustServerCertificate: true}};
mssql.connect(process.env.DB_CONNECTION_STRING || config).then(async pool => {
    try {
        const res = await pool.request().query('SELECT TOP 5 template_name, body_text FROM templates');
        res.recordset.forEach((r, i) => {
            console.log("=== " + r.template_name + " ===");
            console.log(r.body_text.substring(0, 500));
        });
    } catch(e) { console.error(e); }
    process.exit();
});
