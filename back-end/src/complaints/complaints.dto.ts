import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  tenant: string;

  @ApiProperty()
  @IsString()
  property: string;

  @ApiProperty()
  @IsString()
  description: string;
}

export class UpdateComplaintDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resolution?: string;
}
