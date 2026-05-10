const { poolPromise } = require('./src/config/db');

async function dumpVariables() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM global_variables');
        console.log('--- VARIABLE DUMP ---');
        console.log(JSON.stringify(result.recordset, null, 2));
        console.log('--- END DUMP ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dumpVariables();
