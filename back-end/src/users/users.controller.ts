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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
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

@ApiTags('users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  /** Roles that may read other users' profiles. */
  private static readonly STAFF = ['admin', 'super_admin', 'warden'];
  /** Fields a user may not change on their own account. */
  private static readonly SELF_LOCKED = ['role', 'status', 'username', 'paymentStatus', 'rent', 'room', 'checkIn', 'region'];

  constructor(private readonly usersService: UsersService) { }

  @Post('upload-avatar')
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
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
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const filePath = file.path.replace(/\\/g, '/');
    // Always the signed-in user's own avatar.
    await this.usersService.update(req.user.id, { avatar: filePath });
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

  @Post('owner-register')
  registerOwner(@Body() dto: OwnerRegistrationDto) { return this.usersService.registerOwner(dto); }

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
  @Roles('admin', 'warden', 'tenant', 'owner', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    // Tenants, guests and owners may only read their own account.
    if (!UsersController.STAFF.includes(req.user.role) && Number(id) !== req.user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @Roles('admin', 'tenant', 'owner', 'warden', 'guest', 'super_admin')
  @ApiOperation({ summary: 'Update a user' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const role = req.user.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin) {
      if (role === 'warden') {
        // Wardens manage tenant records, never staff accounts or roles.
        const target = await this.usersService.findOne(+id);
        if (Number(id) !== req.user.id && !['tenant', 'guest'].includes(target.role)) throw new ForbiddenException('Wardens can only update tenant accounts');
        delete (updateUserDto as any).role;
      } else {
        // Everyone else edits only their own profile, and not account-level fields.
        if (Number(id) !== req.user.id) throw new ForbiddenException('You can only update your own profile');
        UsersController.SELF_LOCKED.forEach((k) => delete (updateUserDto as any)[k]);
      }
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
