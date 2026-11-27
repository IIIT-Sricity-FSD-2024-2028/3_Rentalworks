import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength, IsByteLength } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/^[^\u0000-\u001f\u007f<>]+$/) name: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/[ ()-]/g, '') : value)
  @IsString() @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Phone must contain 10–15 digits, optionally starting with +.' }) phone: string;
}

export class ChangePasswordDto {
  @IsString() @IsByteLength(1, 72) currentPassword: string;
  @IsString() @MinLength(6) @IsByteLength(6, 72) @Matches(/^\S(?:[\s\S]*\S)?$/, { message: 'New password must not start or end with whitespace.' }) newPassword: string;
  @IsString() @IsByteLength(1, 72) confirmPassword: string;
}

export class CreateAnnouncementDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) message: string;
  @IsIn(['announcement', 'alert', 'update']) type: string;
  @IsIn(['routine', 'important', 'urgent']) priority: string;
  @IsIn(['all', 'tenant', 'warden', 'owner', 'admin']) targetRole: string;
  @IsOptional() @IsInt() targetPropertyId?: number;
  @IsOptional() @IsInt() targetUserId?: number;
  @IsOptional() @IsString() scheduledFor?: string;
}
