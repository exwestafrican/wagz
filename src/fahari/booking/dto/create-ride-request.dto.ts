import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { IsValidPhoneNumberConstraint } from '@/common/validators/is-valid-phone-number';

export class RideRequestPhoneNumberDto {
  @ApiProperty({
    description: 'Country calling code, including the leading +',
    example: '+234',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(8)
  countryCallingCode: string;

  @ApiProperty({
    description: 'National phone number',
    example: '8031234567',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nationalNumber: string;
}

export class CreateRideRequestDto {
  @ApiProperty({
    description: 'Experience code for the resort',
    example: 'araiye',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  experienceCode: string;

  @ApiProperty({ description: 'Number of passengers', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfPassengers: number;

  @ApiProperty({
    description: 'Where to pick the guest up',
    example: '12 Admiralty Way, Lekki',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  pickupLocation: string;

  @ApiProperty({
    description: 'Landmark closest to the pickup location',
    example: 'Opposite Shoprite',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nearestLandmark?: string;

  @ApiProperty({
    description: 'When to pick the guest up for the trip to the resort',
    type: String,
    format: 'date-time',
    example: '2026-10-21T14:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  pickupDateTime: Date;

  @ApiProperty({
    description: 'When to leave the resort',
    type: String,
    format: 'date-time',
    example: '2026-10-22T10:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  departureDateTime: Date;

  @ApiProperty({ description: 'Guest first name', example: 'Amara' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Guest last name', example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Guest email',
    example: 'guest@example.com',
  })
  @IsEmail()
  @IsNotDisposableEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ type: RideRequestPhoneNumberDto })
  @ValidateNested()
  @Type(() => RideRequestPhoneNumberDto)
  @Validate(IsValidPhoneNumberConstraint)
  phoneNumber: RideRequestPhoneNumberDto;
}
