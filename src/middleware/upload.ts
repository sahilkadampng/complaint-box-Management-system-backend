import multer from 'multer';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage(); // Keep in memory → stream to Cloudinary

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`));
    }
};

/**
 * Single-file upload middleware.
 * Field name: "attachment"
 * Max size: 10 MB
 * Allowed: jpg, png, webp, pdf
 */
export const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE },
}).single('attachment');
