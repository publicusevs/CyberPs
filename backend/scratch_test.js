const { poolPromise, mssql } = require('../src/config/db');

async function testGetCase() {
    try {
        const pool = await poolPromise;
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
