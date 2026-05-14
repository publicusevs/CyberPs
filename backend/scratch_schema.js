require('dotenv').config();
const { poolPromise } = require('./src/config/db');
poolPromise.then(pool => pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'legal_notices'"))
.then(res => console.log('legal_notices columns:', res.recordset.map(r => r.COLUMN_NAME).join(', ')))
.catch(console.error);

poolPromise.then(pool => pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dispatch_sequence'"))
.then(res => console.log('dispatch_sequence columns:', res.recordset.map(r => r.COLUMN_NAME).join(', ')))
.catch(console.error)
.finally(() => setTimeout(() => process.exit(0), 1000));
