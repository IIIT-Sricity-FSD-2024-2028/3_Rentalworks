import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingRequestDto {
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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  requestedDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;
}

export class UpdateBookingRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
