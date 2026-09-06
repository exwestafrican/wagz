import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  HOURS_MINUTES_PATTERN,
  ISO_CALENDAR_DATE_PATTERN,
} from '@/fahari/booking/const';

export class CreateClientPickupBookingDto {
  @ApiProperty({
    description: 'Id of the chauffeur assigned to this pickup',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Pickup date (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsString()
  @Matches(ISO_CALENDAR_DATE_PATTERN, {
    message: 'date must be an ISO calendar date (YYYY-MM-DD)',
  })
  date: string;

  @ApiProperty({
    description: 'Pickup time (HH:mm, 24-hour)',
    example: '09:00',
  })
  @IsString()
  @Matches(HOURS_MINUTES_PATTERN, {
    message: 'startTime must be a 24-hour time (HH:mm)',
  })
  startTime: string;

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
