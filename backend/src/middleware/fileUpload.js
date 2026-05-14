const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use default 'fir' or check body. If body is empty during multipart start, 
        // we might need a fixed directory or handle it better.
        const type = req.body.uploadType || 'fir';
        const dir = `uploads/${type}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
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
