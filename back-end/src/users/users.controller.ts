import { OwnerRegistrationDto } from '../owner/owner-registration.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  Query,
  Req,
  Res,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  ParseIntPipe,
  StreamableFile,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { PROPERTY_DOCUMENT_LIMIT, readPropertyDetailsUpload } from '../owner/property-details-document';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  CreateTenantDto,
  UpdateTenantDto,
} from './users.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import {
  browserCookieOptions,
  checkSessionOrigin,
  readBrowserSession,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  signBrowserSession,
} from './browser-session';

const ownerRegistrationPipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

@ApiTags('users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('file', createUploadOptions('./uploads/avatars')),
  )
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const filePath = file.path.replace(/\\/g, '/');
    if (headerUserId && !isNaN(+headerUserId)) {
      await this.usersService.update(+headerUserId, { avatar: filePath });
    }
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      path: filePath,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post('guest-login')
  @ApiOperation({ summary: 'Login specifically for guest booking workflow' })
  guestLogin(@Body() loginDto: LoginDto) {
    return this.usersService.guestLogin(loginDto);
  }

  @Post('session')
  @HttpCode(200)
  async startSession(
    @Body() loginDto: LoginDto,
    @Query('guestOnly') guestOnly: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    checkSessionOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    const user = guestOnly === 'true'
      ? await this.usersService.guestLogin(loginDto)
      : await this.usersService.login(loginDto);
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    response.cookie(SESSION_COOKIE, signBrowserSession(user.id, expiresAt), browserCookieOptions(request));
    return user;
  }

  @Get('session')
  async restoreSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    checkSessionOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    const session = readBrowserSession(request);
    const user = session && await this.usersService.restoreSession(session.userId, session.expiresAt);
    return user;
  }

  @Delete('session')
  @HttpCode(204)
  endSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    checkSessionOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    response.clearCookie(SESSION_COOKIE, browserCookieOptions(request));
  }

  @Get('session/subscription-report')
  subscriptionReport(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    checkSessionOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    const session = readBrowserSession(request);
    if (!session) throw new UnauthorizedException('Sign in to view subscription reports');
    return this.usersService.getSubscriptionReport(session.userId);
  }

  @Get('session/property-documents/:id')
  async propertyDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query('download') download: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    checkSessionOrigin(request);
    const session = readBrowserSession(request);
    if (!session) throw new UnauthorizedException('Sign in to review property documents');
    response.setHeader('Cache-Control', 'no-store');
    const document = await this.usersService.getPropertyDetailsDocument(session.userId, id);
    if (!document) {
      if (download === 'true') throw new NotFoundException('No document was uploaded for this property');
      return null;
    }
    const { data, ...metadata } = document;
    if (download !== 'true') return metadata;

    const filename = encodeURIComponent(document.name).replace(/['()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return new StreamableFile(Buffer.from(data, 'base64'), {
      type: document.contentType,
      disposition: `attachment; filename*=UTF-8''${filename}`,
      length: document.size,
    });
  }

  @Post('owner-register')
  @UseInterceptors(FileInterceptor('document', {
    limits: { fileSize: PROPERTY_DOCUMENT_LIMIT, files: 1, fields: 1, fieldSize: 32768 },
  }))
  @ApiConsumes('multipart/form-data')
  async registerOwner(@Body('details') details: string, @UploadedFile() file?: Express.Multer.File) {
    const document = readPropertyDetailsUpload(file);
    // A JSON field preserves numeric and array types inside the multipart request.
    let application: unknown;
    try {
      application = JSON.parse(details);
    } catch {
      throw new BadRequestException('Invalid owner registration details');
    }
    if (!application || typeof application !== 'object' || Array.isArray(application)) {
      throw new BadRequestException('Invalid owner registration details');
    }
    const dto = await ownerRegistrationPipe.transform(application, { type: 'body', metatype: OwnerRegistrationDto });
    try {
      return await this.usersService.registerOwner(dto, document);
    } catch (error) {
      // The generic exception filter logs query parameters. Strip private upload bytes from database errors.
      if (error instanceof QueryFailedError) {
        throw new InternalServerErrorException('Could not save the property application');
      }
      throw error;
    }
  }

  @Post('guest-register')
  @ApiOperation({ summary: 'Register or authenticate guest user' })
  guestRegister(@Body() dto: { name: string; email: string; phone: string; password?: string; gender?: string }) {
    return this.usersService.guestRegister(dto);
  }

  // --- TENANT ENDPOINTS (Must be before :id to prevent route conflicts) ---

  @Get('tenants')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Get all tenant records with booking, room and payment' })
  getTenants() {
    return this.usersService.getTenants();
  }

  @Post('tenants')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Create new tenant with linked booking, stay, payment' })
  createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.usersService.createTenant(createTenantDto);
  }

  @Put('tenants/:id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update tenant with linked booking, stay, payment' })
  updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.usersService.updateTenant(+id, updateTenantDto);
  }

  @Delete('tenants/:id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Delete tenant and associated records' })
  removeTenant(@Param('id') id: string) {
    return this.usersService.removeTenant(+id);
  }

  // --- STANDARD USER CRUD ---

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('admin', 'warden', 'super_admin')
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner', 'super_admin')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @Roles('admin', 'tenant', 'owner', 'warden', 'super_admin')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
