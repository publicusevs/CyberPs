require('dotenv').config({ path: './.env' });
const { poolPromise } = require('./src/config/db');

async function test() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('dbo.sp_RegisterCyberCrimeCase')");
        if (result.recordset.length > 0) {
            console.log('SP DEFINITION:');
            console.log(result.recordset[0].definition);
        } else {
            console.log('SP not found!');
        }
    } catch (e) {
        console.error('Error fetching SP definition:', e);
    } finally {
        process.exit(0);
    }
}
test();
