import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWardenNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Notification category type', default: 'issue' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Priority level', default: 'medium' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Sender display name' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: 'Sender role (tenant, owner, or system)' })
  @IsOptional()
  @IsString()
  senderRole?: string;

  @ApiPropertyOptional({ description: 'PG / Property name' })
  @IsOptional()
  @IsString()
  propertyName?: string;

  @ApiPropertyOptional({ description: 'Room number' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Tenant user ID' })
  @IsOptional()
  @IsNumber()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Property ID' })
  @IsOptional()
  @IsNumber()
  propertyId?: number;

  @ApiPropertyOptional({ description: 'Reference ID (e.g. complaint ID)' })
  @IsOptional()
  @IsNumber()
  sourceReferenceId?: number;
}

export class UpdateWardenNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;
}
