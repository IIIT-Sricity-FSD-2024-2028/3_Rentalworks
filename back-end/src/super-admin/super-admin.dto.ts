import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRegionalAdminDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(100) region: string;
  @IsString() @MinLength(6) password: string;
  @IsString() @Matches(/^\+?[\d\s-]{9,}$/) phone: string;
}

export class UpdateRegionalAdminDto {
  @IsString() @MinLength(2) @MaxLength(100) region: string;
}

export class UpdateProfileDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsString() phone: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(6) newPassword: string;
}

export class CreateAnnouncementDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) message: string;
  @IsIn(['announcement', 'alert', 'update']) type: string;
  @IsIn(['routine', 'important', 'urgent']) priority: string;
  @IsIn(['all', 'tenant', 'warden', 'owner']) targetRole: string;
  @IsOptional() @IsInt() targetPropertyId?: number;
  @IsOptional() @IsInt() targetUserId?: number;
  @IsOptional() @IsString() scheduledFor?: string;
}
