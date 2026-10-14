import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplaintDto {
  @ApiProperty()
  @IsNumber()
  tenantId: number;

  @ApiProperty()
  @IsNumber()
  propertyId: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, default: 'medium' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ required: false, default: 'general' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  attachment?: string;
}

export class UpdateComplaintDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolvedAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  attachment?: string;
}
