import { IsString, IsNumber, IsOptional } from 'class-validator';
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
  @IsString()
  by: string;
}

export class UpdateNotificationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
