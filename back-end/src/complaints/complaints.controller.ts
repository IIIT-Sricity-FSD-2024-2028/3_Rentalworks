import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, UseInterceptors, UploadedFile, Headers, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiHeader } from '@nestjs/swagger';

@ApiTags('complaints')
@Controller('complaints')
@UseGuards(RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post(':id/upload-attachment')
  @Roles('admin', 'tenant', 'warden')
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/complaints')))
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
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-role', required: true })
  findAll(@Headers('x-user-id') userId: string, @Headers('x-role') role: string) {
    return this.complaintsService.findAll(+userId, role);
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get complaint by ID' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-role', required: true })
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string, @Headers('x-role') role: string) {
    return this.complaintsService.findOne(+id, +userId, role);
  }

  @Post()
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Submit new complaint' })
  @ApiHeader({ name: 'x-user-id', required: true })
  create(@Body() createComplaintDto: CreateComplaintDto, @Headers('x-user-id') userId: string) {
    return this.complaintsService.create(createComplaintDto, +userId);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update complaint status' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-role', required: true })
  update(@Param('id') id: string, @Body() updateComplaintDto: UpdateComplaintDto, @Headers('x-user-id') userId: string, @Headers('x-role') role: string) {
    return this.complaintsService.update(+id, updateComplaintDto, +userId, role);
  }

  @Delete(':id')
  @Roles('admin', 'tenant')
  @ApiOperation({ summary: 'Delete complaint' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-role', required: true })
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string, @Headers('x-role') role: string) {
    return this.complaintsService.remove(+id, +userId, role);
  }
}
