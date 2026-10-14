import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceRequestStatus } from './service-request.entity';

export class CreateServiceRequestDto {
  @ApiProperty({ description: 'Type or category of service requested (Cleaning, Laundry, etc.)' })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiProperty({ description: 'Name of the service' })
  @IsString()
  @IsOptional()
  serviceName?: string;

  @ApiProperty({ description: 'Optional catalog service ID', required: false })
  @IsNumber()
  @IsOptional()
  serviceId?: number;

  @ApiProperty({ description: 'Details or special notes for the service', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Notes alias for compatibility', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Total charge amount if applicable', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Target property ID', required: false })
  @IsNumber()
  @IsOptional()
  propertyId?: number;

  @ApiProperty({ description: 'Target room ID', required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ description: 'Tenant ID', required: false })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({ description: 'Scheduled date/time for service execution', required: false })
  @IsOptional()
  scheduledAt?: Date;
}

export class UpdateServiceRequestDto {
  @ApiProperty({ description: 'Current status of the service request', enum: ServiceRequestStatus, required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Details or special notes', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Notes alias', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Scheduled date/time', required: false })
  @IsOptional()
  scheduledAt?: Date;

  @ApiProperty({ description: 'Completion date/time', required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ description: 'Amount', required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;
}
