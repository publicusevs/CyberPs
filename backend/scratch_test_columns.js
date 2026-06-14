require('dotenv').config({ path: './.env' });
const { poolPromise } = require('./src/config/db');

async function test() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases'");
        console.log('CASES TABLE COLUMNS:');
        console.log(result.recordset.map(r => r.COLUMN_NAME).join(', '));

        const resultComplainants = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'case_complainants'");
        console.log('\nCASE_COMPLAINANTS TABLE COLUMNS:');
        console.log(resultComplainants.recordset.map(r => r.COLUMN_NAME).join(', '));
        
        const resultVictims = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'case_victims'");
        console.log('\nCASE_VICTIMS TABLE COLUMNS:');
        console.log(resultVictims.recordset.map(r => r.COLUMN_NAME).join(', '));

        const resultAccused = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'case_accused'");
        console.log('\nCASE_ACCUSED TABLE COLUMNS:');
        console.log(resultAccused.recordset.map(r => r.COLUMN_NAME).join(', '));
    } catch (e) {
        console.error('Error querying columns:', e);
    } finally {
        process.exit(0);
    }
}
test();
