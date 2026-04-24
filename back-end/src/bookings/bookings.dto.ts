import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tenant: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  property: string;

  @ApiProperty()
  @IsString()
  room: string;

  @ApiProperty()
  @IsString()
  checkIn: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty()
  @IsNumber()
  rent: number;
}

export class UpdateBookingDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  room?: string;
}
