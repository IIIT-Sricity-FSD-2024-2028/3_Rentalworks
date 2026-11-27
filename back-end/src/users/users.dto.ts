import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsIn, IsDateString, Length, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsEnum(['super_admin', 'admin', 'warden', 'tenant', 'owner', 'guest'])
  role: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  preferences?: any;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  preferences?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password?: string;
}

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  room: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty()
  @IsString()
  checkIn: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  rent?: number;

  @ApiProperty({ required: false, default: 'pending' })
  @IsOptional()
  paymentStatus?: string;
}

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  checkIn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  rent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  paymentStatus?: string;
}


/** Guest self sign-up (Login page → "Sign up as guest"). Mirrors utils/signupValidation.js on the frontend. */
export class GuestRegisterDto {
  @ApiProperty()
  @IsString()
  @Length(2, 60)
  @Matches(/^[A-Za-z][A-Za-z .'-]*$/, { message: 'Name can contain letters, spaces, dots and hyphens only' })
  name: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @ApiProperty({ description: 'Dial code and number, e.g. "+91 9876543210"' })
  @Matches(/^\+\d{1,4} \d{7,12}$/, { message: 'Enter a valid phone number' })
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: ['male', 'female', 'other'] })
  @IsIn(['male', 'female', 'other'], { message: 'Gender must be male, female or other' })
  gender: string;

  @ApiProperty({ required: false, example: '2004-03-15' })
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'Enter a valid date of birth' })
  dob?: string;

  @ApiProperty({ required: false, example: 'IN' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter code' })
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Length(2, 50)
  @Matches(/^[A-Za-z][A-Za-z .'-]*$/, { message: 'Enter a valid city name' })
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Length(10, 200, { message: 'Address must be 10 to 200 characters' })
  @Matches(/^[A-Za-z0-9 ,./#()'-]+$/, { message: 'Address contains characters that are not allowed' })
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[A-Za-z0-9 -]{0,10}$/, { message: 'Enter a valid postal code' })
  pincode?: string;
}
