import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Headers, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('properties')
@Controller('properties')
@UseGuards(RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Post(':id/upload-image')
  @Roles('admin', 'owner')
  @UseGuards(SubscriptionGuard)
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/properties')))
  @ApiOperation({ summary: 'Upload property image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return {
      message: 'Property image uploaded successfully',
      propertyId: id,
      filename: file.filename,
      path: file.path,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all properties' })
  // All roles can read properties, tenants use it for discovery
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by id' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'owner')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'Create new property (Requires Active Subscription for Owners)' })
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'Update property (Requires Active Subscription for Owners)' })
  update(@Param('id') id: string, @Body() updatePropertyDto: UpdatePropertyDto) {
    return this.propertiesService.update(+id, updatePropertyDto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete property' })
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(+id);
  }
}
