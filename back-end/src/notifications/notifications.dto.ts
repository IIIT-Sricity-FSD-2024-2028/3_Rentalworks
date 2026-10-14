import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  priority: string;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  recipients?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  byUserId?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

export class UpdateNotificationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
