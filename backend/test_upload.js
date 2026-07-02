const fs = require('fs');

async function testUpload() {
    try {
        const filePath = 'D:\\Cyber\\Cyber FIRs\\FIR_IIFI_27998001240163.pdf';
        
        if (!fs.existsSync(filePath)) {
            console.error("PDF File not found at:", filePath);
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        let body = '';
        body += '--' + boundary + '\r\n';
        body += 'Content-Disposition: form-data; name="fir_file"; filename="test.pdf"\r\n';
        body += 'Content-Type: application/pdf\r\n\r\n';
        
        const payload = Buffer.concat([
            Buffer.from(body, 'utf-8'),
            fileBuffer,
            Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8'),
        ]);

        console.log("Uploading PDF to API...");
        const response = await fetch('http://localhost:5174/api/cases/parse-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary
            },
            body: payload
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Success:", data.success);
        console.log("Data:");
        console.log(JSON.stringify(data.data, null, 2));
        if (data.trace) console.log("Trace:", data.trace);
        if (data.message) console.log("Message:", data.message);
    } catch (error) {
        console.error("Upload failed!", error.message);
    }
}

testUpload();
