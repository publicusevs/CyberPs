const mssql = require('mssql');
const config = {
    user: 'db_ab6f95_cyberweb_admin',
    password: 'Vij@3636',
    server: 'SQL1003.site4now.net',
    database: 'db_ab6f95_cyberweb',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};
async function test() {
    try {
        await mssql.connect(config);
        console.log("Connected successfully");
    } catch (e) {
        console.error("Connection failed:", e.message);
    }
    process.exit(0);
}
test();
