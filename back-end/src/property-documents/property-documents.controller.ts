import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';
import type { Response } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/crud';
import { DOCUMENT_DIR, DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES, PropertyDocumentsService } from './property-documents.service';

const upload = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(DOCUMENT_DIR, { recursive: true });
      cb(null, DOCUMENT_DIR);
    },
    filename: (_req, file, cb) => cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (DOCUMENT_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new BadRequestException('Upload a PDF, JPG, PNG or WEBP file'), false);
  },
});

/**
 * CRUD for property verification documents.
 *   GET    /property-documents?propertyId=   owner: own properties · admin: all
 *   POST   /property-documents (multipart: file, propertyId, docType)   owner / admin
 *   PATCH  /property-documents/:id { status, reviewNote }               admin review
 *   DELETE /property-documents/:id                                      owner (not approved) / admin
 *   GET    /property-documents/:id/file                                 owner / admin — streams the file
 */
@ApiTags('property-documents')
@Controller('property-documents')
@UseGuards(RolesGuard)
export class PropertyDocumentsController {
  constructor(private readonly service: PropertyDocumentsService) {}

  @Get()
  @Roles('owner', 'admin')
  list(@Req() req: { user: AuthUser }, @Query('propertyId') propertyId?: string) {
    return this.service.list(req.user, propertyId ? Number(propertyId) : undefined);
  }

  @Post()
  @Roles('owner', 'admin')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(upload)
  create(@Req() req: { user: AuthUser }, @Body() body: { propertyId?: string; docType?: string }, @UploadedFile() file?: Express.Multer.File) {
    return this.service.upload(req.user, body, file);
  }

  @Patch(':id')
  @Roles('admin')
  review(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number, @Body() body: { status?: string; reviewNote?: string }) {
    return this.service.review(req.user, id, body);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.user, id);
  }

  @Get(':id/file')
  @Roles('owner', 'admin')
  async file(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { full, doc } = await this.service.fileFor(req.user, id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(full).pipe(res);
  }
}
