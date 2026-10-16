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
