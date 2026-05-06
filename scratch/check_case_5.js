const { poolPromise, mssql } = require('./backend/src/config/db');

async function checkCase(id) {
    try {
        const pool = await poolPromise;
        const res = await pool.request().input('id', mssql.Int, id).query('SELECT * FROM cases WHERE case_id=@id');
        const vic = await pool.request().input('id', mssql.Int, id).query('SELECT * FROM case_victims WHERE case_id=@id');
        const acc = await pool.request().input('id', mssql.Int, id).query('SELECT * FROM case_accused WHERE case_id=@id');

        console.log("=== CASE ===");
        console.log(res.recordset);
        console.log("=== VICTIM ===");
        console.log(vic.recordset);
        console.log("=== ACCUSED ===");
        console.log(acc.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkCase(5);
