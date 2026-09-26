import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';

export class CreateClientPickupBookingDto {
  @ApiProperty({
    description: 'Id of the chauffeur assigned to this pickup',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Pickup date and time',
    type: String,
    format: 'date-time',
    example: '2026-09-16T08:30:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDateTime: Date;

  @ApiProperty({
    description: 'Client first name',
    example: 'Amara',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({
    description: 'Client last name',
    example: 'Okafor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: 'Pickup location',
    example: 'JKIA Terminal 1, Nairobi',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  pickupLocation: string;

  @ApiProperty({
    description: 'Client email',
    example: 't@fahari.co',
  })
  @IsEmail()
  @IsNotDisposableEmail()
  email: string;

  @ApiProperty({
    description: 'Map URL for the pickup location',
    example: 'https://maps.google.com/?q=JKIA',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  locationUrl: string;

  @ApiPropertyOptional({
    description: 'Optional details about this pickup',
    example: 'Client asked for a child seat',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note?: string;
}
