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
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './properties.dto';
import { RolesGuard, optionalUser } from '../common/guards/roles.guard';
import { DataSource } from 'typeorm';
import { houseRulesFrom, publicOwner } from './house-rules';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('properties')
@Controller('properties')
@UseGuards(RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService, private readonly db: DataSource) { }

  // Fields only an admin may change (approval and safety checks).
  private static readonly ADMIN_ONLY = ['ownerId', 'status', 'docsVerified', 'inspectionPassed', 'compliance', 'fireSafety', 'safetyScore'];

  /** Owners may only act on their own properties. Admins may act on any. */
  private async assertCanManage(req: { user: { id: number; role: string } }, id: number) {
    const property = await this.propertiesService.findOne(id);
    if (req.user.role === 'owner' && property.ownerId !== req.user.id) {
      throw new ForbiddenException('Property does not belong to this owner');
    }
    return property;
  }

  private stripAdminFields(req: { user: { role: string } }, dto: Record<string, unknown>) {
    if (req.user.role === 'owner') PropertiesController.ADMIN_ONLY.forEach((k) => delete dto[k]);
    // Derived from approved documents (property-documents service), never typed in.
    delete dto.docsVerified;
  }

  /** A property goes live only after its documents are verified and the inspection passed. */
  private assertApprovable(property: { docsVerified: boolean; inspectionPassed: boolean; status: string }, dto: Record<string, unknown>) {
    if (dto.status !== 'approved' || property.status === 'approved') return;
    const inspection = dto.inspectionPassed ?? property.inspectionPassed;
    if (!property.docsVerified) throw new ForbiddenException('Approve all required documents before approving the property');
    if (!inspection) throw new ForbiddenException('Complete the live inspection before approving the property');
  }

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
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filePath = file.path.replace(/\\/g, '/');
    const property = await this.assertCanManage(req, +id);
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
  async findAll(
    @Req() req: any,
    @Query('location') location?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    const rows = await this.propertiesService.findAll(location, ownerId ? +ownerId : undefined);
    const viewer = await optionalUser(this.db, req.headers.authorization);
    return rows.filter((p) => PropertiesController.canView(viewer, p)).map((p) => PropertiesController.present(viewer, p));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by id' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const property = await this.propertiesService.findOne(+id);
    const viewer = await optionalUser(this.db, req.headers.authorization);
    if (!PropertiesController.canView(viewer, property)) throw new NotFoundException(`Property with ID ${id} not found`);
    return PropertiesController.present(viewer, property);
  }

  /**
   * Adds the owner's tenant-facing house rules. Admins get the full owner
   * record; everyone else only the owner's contact details.
   */
  private static present(viewer: { id: number; role: string } | null, p: any) {
    const houseRules = houseRulesFrom(p.owner?.policy);
    const isAdmin = viewer?.role === 'admin' || viewer?.role === 'super_admin';
    return { ...p, houseRules, owner: isAdmin ? p.owner : publicOwner(p.owner) };
  }

  /**
   * The public catalogue shows approved properties only. Owners also see
   * their own unapproved listings; admins see everything.
   */
  private static canView(viewer: { id: number; role: string } | null, p: { status: string; ownerId: number }) {
    if (String(p.status).toLowerCase() === 'approved') return true;
    if (!viewer) return false;
    if (viewer.role === 'admin' || viewer.role === 'super_admin') return true;
    return viewer.role === 'owner' && p.ownerId === viewer.id;
  }

  @Post()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create new property' })
  create(@Req() req: any, @Body() createPropertyDto: CreatePropertyDto) {
    delete (createPropertyDto as any).docsVerified;
    if (req.user.role === 'owner') {
      // New owner listings always start unapproved and belong to the caller.
      this.stripAdminFields(req, createPropertyDto as any);
      Object.assign(createPropertyDto, { ownerId: req.user.id, status: 'pending', docsVerified: false, inspectionPassed: false, compliance: 'Pending', fireSafety: 'Unverified', safetyScore: 0 });
    }
    return this.propertiesService.create(createPropertyDto);
  }

  @Put(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update property' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    const property = await this.assertCanManage(req, +id);
    this.stripAdminFields(req, updatePropertyDto as any);
    this.assertApprovable(property, updatePropertyDto as any);
    return this.propertiesService.update(+id, updatePropertyDto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete property' })
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.assertCanManage(req, +id);
    return this.propertiesService.remove(+id);
  }
}
