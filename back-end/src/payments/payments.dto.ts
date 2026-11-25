import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  tenantId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  propertyId: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty()
  @IsString()
  room: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  method: string;

  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clearance?: string;
}

export class UpdatePaymentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clearance?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;
}
