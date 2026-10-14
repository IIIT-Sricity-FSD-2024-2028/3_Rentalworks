import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty()
  @IsNumber()
  tenantId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsNumber()
  propertyId: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty()
  @IsString()
  room: string;

  @ApiProperty()
  @IsString()
  checkIn: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  checkOut?: string;

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

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  checkOut?: string;
}

export class CheckoutBookingDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  guestId?: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty()
  @IsNumber()
  propertyId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  propertyName?: string;

  @ApiProperty()
  @IsString()
  roomType: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @ApiProperty()
  @IsString()
  checkIn: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty()
  @IsNumber()
  rent: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  deposit?: number;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiProperty()
  @IsString()
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  roommate?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  lifestyleProfile?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upiId?: string;
}
