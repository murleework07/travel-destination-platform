import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { ApiError } from '../utils/ApiError.js';

export const UPLOAD_DIR = path.join(import.meta.dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const uploadImages = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random name: users can't overwrite files or use path tricks like ../../
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    cb(ApiError.badRequest('Only JPG, PNG and WebP images are allowed'));
  },
}).array('images', 5);