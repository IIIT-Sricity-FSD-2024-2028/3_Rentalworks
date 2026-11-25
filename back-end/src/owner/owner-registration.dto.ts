import { IsString, IsNotEmpty, IsEmail, IsInt, Min, IsArray, IsBoolean, Equals } from 'class-validator';

export class OwnerRegistrationDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() propertyName: string;
  @IsString() @IsNotEmpty() propertyAddress: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() state: string;
  @IsInt() @Min(1) totalRooms: number;
  @IsInt() @Min(1) totalCapacity: number;
  @IsArray() @IsString({ each: true }) amenities: string[];
  @IsBoolean() @Equals(true) commissionAgreed: boolean;
}
