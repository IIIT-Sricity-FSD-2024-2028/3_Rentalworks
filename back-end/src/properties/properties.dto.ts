import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsString()
  owner: string;

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
}
