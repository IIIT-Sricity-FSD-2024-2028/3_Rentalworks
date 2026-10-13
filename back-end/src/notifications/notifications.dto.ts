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

  @ApiProperty()
  @IsNumber()
  recipients: number;

  @ApiProperty()
  @IsNumber()
  byUserId: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;
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
}
