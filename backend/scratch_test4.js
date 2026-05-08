const xlsx = require('xlsx');
const FormData = require('form-data');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');

// Create Excel File
const data = [
    {
        "S.No": 1,
        "Acknowledgement No": "3270427...",
        "Account No / Wallet (FICN/FICW)": "Case Root",
        "Transaction ID (UTR Number)": "KKBKR22026042422439684",
        "Bank Name": "ICICI Bank",
        "Layer": "1",
        "Account No": "414605002397",
        "IFSC Code": "ICIC0004146",
        "Transaction Date": "29-04-2026",
        "Disputed Amount": 18000000
    },
    {
        "S.No": 2,
        "Acknowledgement No": "3270427...",
        "Account No / Wallet (FICN/FICW)": "414605002397",
        "Transaction ID (UTR Number)": "KKBKR22026042422439684",
        "Bank Name": "HDFC Bank",
        "Layer": "2",
        "Account No": "5960859699",
        "IFSC Code": "HDFC0005960",
        "Transaction Date": "29-04-2026",
        "Disputed Amount": 350108
    }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, "test_upload.xlsx");

// Upload it
const token = jwt.sign(
    { user_id: 1, role: 'Admin' },
    'cyber_crime_secret_key_2024',
    { expiresIn: '1h' }
);

const form = new FormData();
form.append('case_id', '6');
form.append('excel_file', fs.createReadStream('test_upload.xlsx'));

const options = {
    hostname: 'localhost',
    port: 1433,
    path: '/api/transactions/import',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
    }
};

const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${responseData}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

form.pipe(req);
