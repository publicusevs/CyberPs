const mssql = require('mssql');

const dbConfig = {
    user: 'db_ab6f95_cyberweb_admin',
    password: 'Vij@3636',
    server: 'SQL1003.site4now.net',
    port: 1433,
    database: 'db_ab6f95_cyberweb',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
    },
};

async function testGetCase() {
    try {
        const pool = await new mssql.ConnectionPool(dbConfig).connect();
        const id = 6;
        console.log('Testing queries for case', id);

        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM cases WHERE case_id = @case_id');
        console.log('cases OK');
        
        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_victims WHERE case_id = @case_id');
        console.log('case_victims OK');

        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM fir_documents WHERE case_id = @case_id');
        console.log('fir_documents OK');

        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_evidence WHERE case_id = @case_id ORDER BY uploaded_at DESC');
        console.log('case_evidence OK');

        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_transactions WHERE case_id = @case_id');
        console.log('case_transactions OK');

        await pool.request().input('case_id', mssql.Int, id).query('SELECT n.*, u.name as author FROM case_notes n JOIN users u ON n.user_id = u.user_id WHERE case_id = @case_id ORDER BY n.created_at DESC');
        console.log('case_notes OK');

        await pool.request().input('case_id', mssql.Int, id).query('SELECT * FROM case_accused WHERE case_id = @case_id');
        console.log('case_accused OK');

        console.log('All OK');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testGetCase();
