const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function testOcr() {
    console.log("Starting OCR on page_1.png...");
    try {
        const result = await Tesseract.recognize(
            path.join(__dirname, 'page_1.png'),
            'hin+eng',
            { logger: m => console.log(m) }
        );
        fs.writeFileSync(path.join(__dirname, 'ocr_result_1.txt'), result.data.text);
        console.log("OCR finished. Result written to ocr_result_1.txt");
    } catch (err) {
        console.error("OCR Error:", err);
    }
}

testOcr();
