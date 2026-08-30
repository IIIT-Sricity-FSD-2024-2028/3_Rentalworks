import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRemarkDto {
  @ApiProperty()
  @IsNumber()
  complaintId: number;

  @ApiProperty()
  @IsNumber()
  authorId: number;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authorRole?: string;
}
