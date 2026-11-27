import { BadRequestException } from '@nestjs/common';
import type { PropertyDetailsDocument } from '../properties/property.entity';

export const PROPERTY_DOCUMENT_LIMIT = 5 * 1024 * 1024;

export function readPropertyDetailsUpload(file?: Express.Multer.File): PropertyDetailsDocument {
  if (!file?.buffer.length) throw new BadRequestException('Upload one property details document');

  // Identify the actual file contents before accepting a private upload.
  const bytes = file.buffer;
  const header = bytes.subarray(0, 8).toString('hex');
  const contentType = header.startsWith('255044462d') ? 'application/pdf'
    : header.startsWith('ffd8ff') ? 'image/jpeg'
    : header === '89504e470d0a1a0a' ? 'image/png'
    : null;
  if (!contentType) throw new BadRequestException('Use a PDF, JPG, or PNG property details document');

  const name = file.originalname.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180);
  return {
    name: name || 'property-details',
    contentType,
    size: bytes.length,
    data: bytes.toString('base64'),
  };
}
