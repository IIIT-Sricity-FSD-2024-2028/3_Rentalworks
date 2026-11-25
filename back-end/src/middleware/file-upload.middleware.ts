import { diskStorage } from 'multer';
import { extname } from 'path';

export const createUploadOptions = (destination: string = './uploads') => ({
  storage: diskStorage({
    destination,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
});
