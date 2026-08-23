import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('complaints')
@Controller('complaints')
@UseGuards(RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post(':id/upload-attachment')
  @Roles('admin', 'tenant', 'warden')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/complaints',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  @ApiOperation({ summary: 'Upload complaint attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadAttachment(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return {
      message: 'Complaint attachment uploaded successfully',
      complaintId: id,
      filename: file.filename,
      path: file.path,
    };
  }

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all complaints' })
  findAll() {
    return this.complaintsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get complaint by ID' })
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Submit new complaint' })
  create(@Body() createComplaintDto: CreateComplaintDto) {
    return this.complaintsService.create(createComplaintDto);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update complaint status' })
  update(@Param('id') id: string, @Body() updateComplaintDto: UpdateComplaintDto) {
    return this.complaintsService.update(+id, updateComplaintDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Delete complaint' })
  remove(@Param('id') id: string) {
    return this.complaintsService.remove(+id);
  }
}
