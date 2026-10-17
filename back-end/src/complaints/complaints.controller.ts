import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiHeader } from '@nestjs/swagger';

@ApiTags('complaints')
@Controller('complaints')
@UseGuards(RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) { }

  @Post(':id/upload-attachment')
  @Roles('admin', 'tenant', 'warden')
  @UseInterceptors(
    FileInterceptor('file', createUploadOptions('./uploads/complaints')),
  )
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
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      throw new NotFoundException(`Invalid complaint ID: ${id}`);
    }
    const filePath = file.path.replace(/\\/g, '/');
    await this.complaintsService.update(numId, { attachment: filePath });
    return {
      message: 'Complaint attachment uploaded successfully',
      complaintId: numId,
      filename: file.filename,
      path: filePath,
    };
  }

  @Get('my')
  @Roles('tenant', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get current tenant complaints' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Tenant user ID' })
  async findMy(
    @Headers('x-user-id') headerUserId?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = headerUserId ? parseInt(headerUserId, 10) : queryTenantId ? parseInt(queryTenantId, 10) : null;
    if (!tenantId || isNaN(tenantId)) {
      throw new UnauthorizedException('x-user-id header or tenantId query is required');
    }
    return this.complaintsService.findAll(tenantId);
  }

  @Get()
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get all complaints' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.complaintsService.findAll(
      tenantId ? +tenantId : undefined,
      propertyId ? +propertyId : undefined,
    );
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get complaint by ID' })
  findOne(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      throw new NotFoundException(`Invalid complaint ID: ${id}`);
    }
    return this.complaintsService.findOne(numId);
  }

  @Post()
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Submit new complaint' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Tenant user ID' })
  create(
    @Body() createComplaintDto: CreateComplaintDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    if (!createComplaintDto.tenantId && headerUserId) {
      const parsed = parseInt(headerUserId, 10);
      if (!isNaN(parsed)) {
        createComplaintDto.tenantId = parsed;
      }
    }
    return this.complaintsService.create(createComplaintDto);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update complaint status' })
  update(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
  ) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      throw new NotFoundException(`Invalid complaint ID: ${id}`);
    }
    return this.complaintsService.update(numId, updateComplaintDto);
  }

  @Delete(':id')
  @Roles('admin', 'tenant', 'owner')
  @ApiOperation({ summary: 'Delete complaint' })
  remove(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      throw new NotFoundException(`Invalid complaint ID: ${id}`);
    }
    return this.complaintsService.remove(numId);
  }
}
