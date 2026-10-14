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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('properties')
@Controller('properties')
@UseGuards(RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) { }

  @Post(':id/upload-image')
  @Roles('admin', 'owner')
  @UseInterceptors(
    FileInterceptor('file', createUploadOptions('./uploads/properties')),
  )
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
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filePath = file.path.replace(/\\/g, '/');
    const property = await this.propertiesService.findOne(+id);
    const images = Array.isArray(property.images)
      ? [...property.images, filePath]
      : [filePath];
    await this.propertiesService.update(+id, { images });

    return {
      message: 'Property image uploaded successfully',
      propertyId: id,
      filename: file.filename,
      path: filePath,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all properties' })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(
    @Query('location') location?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.propertiesService.findAll(
      location,
      ownerId ? +ownerId : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by id' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create new property' })
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update property' })
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(+id, updatePropertyDto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete property' })
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(+id);
  }
}
