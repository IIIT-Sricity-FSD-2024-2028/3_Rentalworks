import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  location: string;

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
  @IsOptional()
  rooms?: any;

  @ApiProperty()
  @IsArray()
  amenities: string[];

  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
  @IsString() @IsOptional() type?: string;
  @IsInt() @Min(0) @IsOptional() totalCapacity?: number;
  @IsInt() @Min(0) @IsOptional() totalRooms?: number;
  @IsInt() @Min(0) @IsOptional() occupiedRooms?: number;
  @IsNumber() @Min(0) @IsOptional() monthlyRent?: number;

  @ApiProperty({ required: false, default: 'unisex' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rules?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  images?: string[];
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
  @IsOptional()
  rooms?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  amenities?: string[];

  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsString() @IsOptional() pincode?: string;
  @IsString() @IsOptional() type?: string;
  @IsInt() @Min(0) @IsOptional() totalCapacity?: number;
  @IsInt() @Min(0) @IsOptional() totalRooms?: number;
  @IsInt() @Min(0) @IsOptional() occupiedRooms?: number;
  @IsNumber() @Min(0) @IsOptional() monthlyRent?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rules?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  images?: string[];
}
