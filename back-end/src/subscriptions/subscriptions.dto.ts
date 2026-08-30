import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty({ description: 'ID of the subscription plan to purchase' })
  @IsNumber()
  planId: number;

  @ApiProperty({ required: false, default: 'MockGateway' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  ownerId?: number;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Order ID received during checkout' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Transaction reference ID' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'ID of the plan to activate' })
  @IsNumber()
  planId: number;

  @ApiProperty({ required: false, default: 'MockGateway' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  ownerId?: number;
}

export class RenewSubscriptionDto {
  @ApiProperty({ required: false, description: 'Optional plan ID if changing plan during renewal' })
  @IsNumber()
  @IsOptional()
  planId?: number;

  @ApiProperty({ required: false, default: 'MockGateway' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  ownerId?: number;
}

export class UpgradeSubscriptionDto {
  @ApiProperty({ description: 'Target plan ID to upgrade to' })
  @IsNumber()
  newPlanId: number;

  @ApiProperty({ required: false, default: 'MockGateway' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  simulateFailure?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  ownerId?: number;
}
