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

class PropertyDetailsDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  occupiedRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyRent?: number;

}

export class CreatePropertyDto extends PropertyDetailsDto {
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

export class UpdatePropertyDto extends PropertyDetailsDto {
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

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  rules?: string[];

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  images?: string[];
}
