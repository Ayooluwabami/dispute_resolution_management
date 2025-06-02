import multer from 'multer';
import path from 'path';
import mimeTypes from 'mime-types';
import { randomBytes } from 'crypto';
import sanitizeFilename from 'sanitize-filename';
import { config } from '../config/env.config';
import { HttpError } from './httpError';
import { Request } from 'express';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.storageDir);
  },
  filename: (req, file, cb) => {
    const randomString = randomBytes(8).toString('hex');
    const sanitizedName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedName);
    cb(null, `${randomString}${extension}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    if (file.size > config.upload.maxFileSize) {
      return cb(new HttpError(400, `File size exceeds ${config.upload.maxFileSize / 1024 / 1024}MB`));
    }

    if (!config.upload.allowedTypes.includes(file.mimetype)) {
      return cb(
        new HttpError(
          400,
          `File type not allowed. Allowed types: ${config.upload.allowedTypes
            .map((mime) => mime.split('/')[1].toUpperCase())
            .join(', ')}`
        )
      );
    }

    cb(null, true);
  } catch (error: any) {
    cb(error instanceof HttpError ? error : new HttpError(500, 'Error processing file'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
});