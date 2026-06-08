import multer from 'multer';
// Configure multer to store files in memory
const storage = multer.memoryStorage();
// Filter to accept only image files
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimes.join(', ')}`));
    }
};
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
// Error handling middleware for multer
export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            res.status(400).json({ error: 'File size exceeds 10MB limit' });
        }
        else if (err.code === 'LIMIT_FILE_COUNT') {
            res.status(400).json({ error: 'Too many files' });
        }
        else {
            res.status(400).json({ error: `Upload error: ${err.message}` });
        }
    }
    else if (err) {
        res.status(400).json({ error: err.message });
    }
    else {
        next();
    }
};
