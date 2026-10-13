import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room number, e.g. 101, A-204' })
  @IsString()
  roomNumber: string;

  @ApiProperty({ description: 'Property ID this room belongs to', default: 1 })
  @IsNumber()
  @IsOptional()
  propertyId?: number;

  @ApiProperty({ description: 'Room capacity (e.g. 1 for Single, 2 for Double, 3 for Triple)', default: 2 })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ description: 'Current occupancy count', default: 0 })
  @IsNumber()
  @IsOptional()
  currentOccupancy?: number;

  @ApiProperty({ description: 'Monthly rent for the room', default: 8000 })
  @IsOptional()
  rent?: number;

  @ApiProperty({ description: 'Room occupancy status (available, full)', default: 'available' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Room maintenance status (Ready, Under Maintenance, Cleaned)', default: 'Ready' })
  @IsString()
  @IsOptional()
  maintenanceStatus?: string;
}

export class UpdateRoomDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  propertyId?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  currentOccupancy?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  rent?: number;

  @ApiProperty({ required: false, description: 'Occupancy status: available or full' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, description: 'Maintenance status: Ready, Under Maintenance, Cleaned' })
  @IsString()
  @IsOptional()
  maintenanceStatus?: string;
}
