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

export class CreateFleetBookingDto {
  @ApiProperty({
    description: 'Id of the chauffeur assigned to this booking',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Calendar date of the booking (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsString()
  @Matches(ISO_CALENDAR_DATE_PATTERN, {
    message: 'date must be an ISO calendar date (YYYY-MM-DD)',
  })
  date: string;

  @ApiProperty({
    description: 'Start time of the booking (HH:mm, 24-hour)',
    example: '09:00',
  })
  @IsString()
  @Matches(HOURS_MINUTES_PATTERN, {
    message: 'startTime must be a 24-hour time (HH:mm)',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time of the booking (HH:mm, 24-hour)',
    example: '17:00',
  })
  @IsString()
  @Matches(HOURS_MINUTES_PATTERN, {
    message: 'endTime must be a 24-hour time (HH:mm)',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Optional details about this booking',
    example: 'Airport run after the board meeting',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note?: string;
}
