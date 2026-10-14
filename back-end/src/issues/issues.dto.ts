import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IssueCategory, IssuePriority, IssueStatus } from './issue.entity';

export class CreateIssueDto {
  @ApiProperty({ description: 'Issue brief title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed issue description' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Category of the issue',
    enum: IssueCategory,
    default: IssueCategory.OTHER,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Priority level',
    enum: IssuePriority,
    default: IssuePriority.MEDIUM,
  })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ description: 'Location within property or room', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Associated property ID', required: false })
  @IsNumber()
  @IsOptional()
  propertyId?: number;

  @ApiProperty({ description: 'Associated room ID', required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ description: 'Tenant user ID', required: false })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({ description: 'Issue status', enum: IssueStatus, required: false })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateIssueDto {
  @ApiProperty({ description: 'Issue brief title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Detailed issue description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Category of the issue', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Priority level', required: false })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ description: 'Current status', enum: IssueStatus, required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Location within property or room', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Resolution date timestamp', required: false })
  @IsOptional()
  resolvedAt?: Date;
}
