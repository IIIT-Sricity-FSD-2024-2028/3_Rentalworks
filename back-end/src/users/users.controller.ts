import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createUploadOptions } from '../middleware/file-upload.middleware';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, LoginDto } from './users.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', createUploadOptions('./uploads/avatars')))
  @ApiOperation({ summary: 'Upload user avatar (Router-level middleware)' })
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
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      path: file.path,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Public registration for new users (owners, guests)' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'tenant', 'owner')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @Roles('admin', 'tenant', 'owner', 'warden')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
