const { poolPromise } = require("./backend/src/config/db"); 
async function test() { 
    const pool = await poolPromise; 
    const r = await pool.request().query("SELECT TOP 1 notice_content FROM case_legal_notices WHERE notice_category = 'Others' ORDER BY id DESC"); 
    console.log("Length: ", r.recordset[0].notice_content.length); 
    process.exit(0); 
} 
test();
