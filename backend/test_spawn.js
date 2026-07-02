const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'src', 'scripts', 'fir_extractor.py');
// We need a dummy PDF to test. I will create a dummy txt and pass it just to see the error.
const pdfPath = path.join(__dirname, 'package.json');

const pythonProcess = spawn('python', [scriptPath, pdfPath]);
let output = '';
let errorOutput = '';

pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

pythonProcess.on('close', (code) => {
    console.log("Code:", code);
    console.log("Output:", output);
    console.log("Error:", errorOutput);
});
