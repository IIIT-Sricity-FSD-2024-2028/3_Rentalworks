import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsNumber()
  ownerId: number;

  @ApiProperty()
  @IsNumber()
  rentMin: number;

  @ApiProperty()
  @IsNumber()
  rentMax: number;

  @ApiProperty()
  @IsString()
  rooms: string;

  @ApiProperty()
  @IsArray()
  amenities: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  totalCapacity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  totalRooms?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  occupiedRooms?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  monthlyRent?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rules?: string[];
}

export class UpdatePropertyDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  docsVerified?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  inspectionPassed?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  ownerId?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  rentMin?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  rentMax?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rooms?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  totalCapacity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  totalRooms?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  occupiedRooms?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  monthlyRent?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rules?: string[];
}
