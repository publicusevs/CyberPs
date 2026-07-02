const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('D:\\\\Cyber\\\\Cyber FIRs\\\\FIR_IIFI_27998001230053.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('parsed_pdf.txt', data.text);
    console.log("PDF parsed successfully.");
}).catch(err => {
    console.error("Error parsing PDF:", err);
});
