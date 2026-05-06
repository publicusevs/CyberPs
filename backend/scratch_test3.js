const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');

const token = jwt.sign(
    { user_id: 1, role: 'Admin' },
    'cyber_crime_secret_key_2024',
    { expiresIn: '1h' }
);

const options = {
    hostname: 'localhost',
    port: 1433,
    path: '/api/cases/6',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('scratch_test3_output_utf8.txt', `Status: ${res.statusCode}\nBody: ${data}`, 'utf8');
        console.log('Done');
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
