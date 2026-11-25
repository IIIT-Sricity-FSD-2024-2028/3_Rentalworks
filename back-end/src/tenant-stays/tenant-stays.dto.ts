import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantStayDto {
  @ApiProperty()
  @IsNumber()
  tenantId: number;

  @ApiProperty()
  @IsNumber()
  propertyId: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty()
  @IsString()
  moveInDate: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  moveOutDate?: string;

  @ApiProperty({ required: false, default: 'active' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateTenantStayDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  moveOutDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;
}
