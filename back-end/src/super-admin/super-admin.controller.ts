import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChangePasswordDto, CreateAnnouncementDto, CreateRegionalAdminDto, TwoFactorCodeDto, UpdateProfileDto, UpdateRegionalAdminDto } from './super-admin.dto';
import { SuperAdminService } from './super-admin.service';

@Controller('super-admin')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Get('overview')
  async overview() {
    await this.service.dueAnnouncements();
    return this.service.overview();
  }

  @Post('regional-admins')
  createAdmin(@Body() dto: CreateRegionalAdminDto) { return this.service.createAdmin(dto); }

  @Put('regional-admins/:id')
  updateAdmin(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegionalAdminDto) { return this.service.updateAdmin(id, dto); }

  @Get('profile')
  profile(@Req() request: { superAdminId: number }) { return this.service.profile(request.superAdminId); }

  @Put('profile')
  updateProfile(@Req() request: { superAdminId: number }, @Body() dto: UpdateProfileDto) { return this.service.updateProfile(request.superAdminId, dto); }

  @Put('password')
  password(@Req() request: { superAdminId: number }, @Body() dto: ChangePasswordDto) { return this.service.changePassword(request.superAdminId, dto); }

  @Post('two-factor/setup')
  setupTwoFactor(@Req() request: { superAdminId: number }) { return this.service.startTwoFactor(request.superAdminId); }

  @Post('two-factor/confirm')
  confirmTwoFactor(@Req() request: { superAdminId: number }, @Body() dto: TwoFactorCodeDto) { return this.service.confirmTwoFactor(request.superAdminId, dto.code); }

  @Post('two-factor/disable')
  disableTwoFactor(@Req() request: { superAdminId: number }, @Body() dto: TwoFactorCodeDto) { return this.service.disableTwoFactor(request.superAdminId, dto.code); }

  @Post('announcements')
  announce(@Req() request: { superAdminId: number }, @Body() dto: CreateAnnouncementDto) { return this.service.announce(request.superAdminId, dto); }
}
