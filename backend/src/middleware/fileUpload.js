'use strict';

/**
 * fileUpload.js — Multer middleware configured with a WRITABLE destination path.
 *
 * CRITICAL FIX: In pkg portable builds, `process.cwd()` and relative paths
 * resolve to a virtual read-only snapshot. We use appPaths.getUploadsDir()
 * to always get a real, writable path on disk.
 */

const multer = require('multer');
const path = require('path');
const { getUploadsDir } = require('../utils/appPaths');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use uploadType from body, or fall back to 'fir'.
        // Note: during multipart upload the body may not be fully parsed yet,
        // so we use 'fir' as the default for PDF/FIR uploads.
        const type = req.body.uploadType || 'fir';
        
        // getUploadsDir creates the directory if it doesn't exist
        // and returns the REAL absolute path (works in both dev & pkg).
        const dir = getUploadsDir(type);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — large forensic Excel files
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();

        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream', // Some browsers send excel as octet-stream
            'text/csv'
        ];

        if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
            return cb(null, true);
        }

        cb(new Error('Only images, PDFs, and Excel files are allowed'));
    }
});

module.exports = upload;
