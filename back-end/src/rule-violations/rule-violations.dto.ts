import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleViolationDto {
  @ApiProperty({ description: 'Tenant User ID (must match an existing user with role tenant)' })
  @IsNumber()
  tenantId: number;

  @ApiProperty({ description: 'Violation type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Severity level: low, medium, high' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Initial warnings count' })
  @IsOptional()
  @IsNumber()
  warningCount?: number;

  @ApiPropertyOptional({ description: 'Room number' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Tenant name (cached)' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({ description: 'Violation description / notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Reported date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  reportedAt?: string;
}

export class UpdateRuleViolationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  warningCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  escalatedToOwner?: boolean;
}
