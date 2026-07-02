/**
 * cases.controller.js — Thin HTTP layer for Cases domain.
 * All methods parse request → call CasesService → send response.
 */

'use strict';

const asyncHandler = require('../../core/asyncHandler');
const { sendSuccess, sendCreated } = require('../../core/responseHelper');
const CasesService = require('./cases.service');

exports.register = asyncHandler(async (req, res) => {
    const result = await CasesService.registerCyberCrimeCase(req.body, req.user, req.file);
    sendCreated(res, result, 'Case Registered Successfully');
});

exports.createCase = asyncHandler(async (req, res) => {
    const result = await CasesService.createCase(req.body, req.user, req.file);
    sendCreated(res, result, 'Case registered successfully');
});

exports.updateFullCase = asyncHandler(async (req, res) => {
    const result = await CasesService.updateFullCase(req.params.id, req.body, req.file);
    sendSuccess(res, result, 'Case updated successfully');
});

exports.getAllCases = asyncHandler(async (req, res) => {
    const data = await CasesService.getAllCases(req.user);
    sendSuccess(res, data);
});

exports.getCaseById = asyncHandler(async (req, res) => {
    const result = await CasesService.getCaseById(req.params.id, req.user.police_station_id, req.user.role === 'Admin');
    res.json({ success: true, ...result }); // Preserve exact original response shape
});

exports.updateProfiles = asyncHandler(async (req, res) => {
    await CasesService.updateProfiles(req.params.id, req.body);
    sendSuccess(res, null, 'Profiles updated successfully');
});

exports.addNote = asyncHandler(async (req, res) => {
    await CasesService.addNote({ ...req.body, case_id: req.params.id, user_id: req.user.user_id });
    sendSuccess(res, null, 'Note added');
});

exports.searchCases = asyncHandler(async (req, res) => {
    const data = await CasesService.searchCases(req.query.q);
    sendSuccess(res, data);
});

exports.updateStatus = asyncHandler(async (req, res) => {
    await CasesService.updateStatus(req.params.id, req.body, req.user.user_id);
    sendSuccess(res, null, 'Status updated');
});

exports.addEvidence = asyncHandler(async (req, res) => {
    await CasesService.addEvidence(req.files, req.body);
    sendSuccess(res, null, 'Evidence uploaded successfully');
});

exports.deleteFile = asyncHandler(async (req, res) => {
    await CasesService.deleteFile(req.body);
    sendSuccess(res, null, 'File deleted successfully');
});

exports.saveNotice = asyncHandler(async (req, res) => {
    const result = await CasesService.saveNotice(req.body);
    sendSuccess(res, result, 'Notice saved to dossier');
});

exports.getNodalRecipients = asyncHandler(async (req, res) => {
    const data = await CasesService.getNodalRecipients(req.params.id, req.query.category);
    sendSuccess(res, data);
});

exports.sendNodalEmails = asyncHandler(async (req, res) => {
    const result = await CasesService.sendNodalEmails(req.body);
    sendSuccess(res, result, 'Mailing process complete');
});

exports.parseFirPdf = asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    
    const fs = require('fs');
    const path = require('path');
    const { spawn } = require('child_process');
    
    const pdfPath = req.file.path;
    const isPkg = typeof process.pkg !== 'undefined';
    let cmd, args, scriptPath;
    
    if (isPkg) {
        // In portable mode, we run the compiled fir_extractor.exe
        scriptPath = path.join(path.dirname(process.execPath), 'scripts', 'fir_extractor.exe');
        cmd = scriptPath;
        args = [pdfPath];
    } else {
        // In dev mode, we run python script directly
        scriptPath = path.join(__dirname, '..', '..', 'scripts', 'fir_extractor.py');
        cmd = 'python';
        args = [scriptPath, pdfPath];
    }
    
    try {
        const extractedDataJSON = await new Promise((resolve, reject) => {
            const pythonProcess = spawn(cmd, args);
            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
            pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to start extractor (${cmd}): ${err.message}`));
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Extractor failed with code ${code}:\n${errorOutput}`));
                } else {
                    resolve(output.trim());
                }
            });
        });

        // Cleanup PDF file
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        // Parse JSON output from python
        let parsedData;
        try {
            parsedData = JSON.parse(extractedDataJSON);
            
            // Save a copy of the extracted JSON for debugging as requested by user (only in dev)
            if (!isPkg) {
                try {
                    fs.writeFileSync(path.join(__dirname, '../../../../extracted_fir.json'), JSON.stringify(parsedData, null, 2), 'utf8');
                } catch(e) { console.warn("Could not write extracted_fir.json", e); }
            }
            
            if (!parsedData.success) {
                try {
                    fs.writeFileSync('last_error.txt', parsedData.trace || parsedData.error);
                } catch(e) { console.warn("Could not write last_error.txt", e); }
                return res.status(500).json({ success: false, message: parsedData.error, trace: parsedData.trace });
            }
        } catch (e) {
            if (!isPkg) {
                try {
                    fs.writeFileSync(path.join(__dirname, '../../../../last_error.txt'), `JSON Parse Error: ${e.message}\nOutput was: ${extractedDataJSON}`);
                } catch(err) { console.warn("Could not write last_error.txt", err); }
            }
            return res.status(500).json({ success: false, message: 'Failed to parse extracted data', trace: e.message });
        }
        
        sendSuccess(res, parsedData.data, 'PDF parsed successfully');
    } catch (error) {
        if (typeof pdfPath !== 'undefined' && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to process PDF', error: error.message });
    }
});
