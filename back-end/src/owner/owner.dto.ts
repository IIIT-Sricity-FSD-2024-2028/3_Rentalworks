import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateOwnerProfileDto {
  @IsString() @MaxLength(120) @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @MaxLength(30) @IsOptional() phone?: string;
  @IsString() @MaxLength(120) @IsOptional() company?: string;
  @IsString() @MaxLength(100) @IsOptional() city?: string;
  @IsString() @MaxLength(100) @IsOptional() state?: string;
  @IsString() @MaxLength(10) @IsOptional() pincode?: string;
  @IsString() @MaxLength(2000) @IsOptional() bio?: string;
  @IsString() @IsOptional() avatar?: string;
}

export class UpdateOwnerPolicyDto {
  @IsInt() @Min(1) @Max(31) @IsOptional() rentDueDay?: number;
  @IsInt() @Min(0) @IsOptional() lateFee?: number;
  @IsInt() @Min(0) @IsOptional() securityDeposit?: number;
  @IsInt() @Min(0) @Max(100) @IsOptional() rentIncrease?: number;
  @IsInt() @Min(1) @IsOptional() leaseTermMonths?: number;
  @IsInt() @Min(0) @IsOptional() noticePeriod?: number;
  @IsBoolean() @IsOptional() autoRenew?: boolean;
  @IsIn(['allowed', 'restricted', 'not-allowed']) @IsOptional() guestPolicy?: string;
  @IsString() @IsOptional() guestHours?: string;
  @IsBoolean() @IsOptional() smokingAllowed?: boolean;
  @IsBoolean() @IsOptional() petsAllowed?: boolean;
  @IsString() @IsOptional() maintenanceWindow?: string;
  @IsIn(['yearly', 'half-yearly', 'never']) @IsOptional() rentIncreaseFrequency?: string;
}

export class ChangeOwnerPasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

export class RequestOwnerPlanDto {
  @IsInt() @Min(1) planId: number;
}
