import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_OR_PDF_TYPES = [...IMAGE_TYPES, 'application/pdf'];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * Multer options for public uploads (served under /uploads). Only the given
 * file types are accepted, one file per request, up to `maxMb`. The saved
 * name comes from the checked type, never from the uploaded file name, so a
 * file cannot be stored as .html / .svg / .js and served back from our domain.
 */
export const createUploadOptions = (destination: string = './uploads', { types = IMAGE_TYPES, maxMb = 5 }: { types?: string[]; maxMb?: number } = {}) => ({
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = EXTENSIONS[file.mimetype] || extname(file.originalname).toLowerCase();
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (types.includes(file.mimetype)) cb(null, true);
    else cb(new BadRequestException(`Upload ${types.map((t) => EXTENSIONS[t]?.slice(1).toUpperCase()).join(', ')} files only (max ${maxMb} MB)`), false);
  },
});
