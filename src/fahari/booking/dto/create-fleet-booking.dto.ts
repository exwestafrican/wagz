import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFleetBookingDto {
  @ApiProperty({
    description: 'Id of the chauffeur assigned to this booking',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Start of the booking',
    type: String,
    format: 'date-time',
    example: '2026-09-15T09:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDateTime: Date;

  @ApiProperty({
    description: 'End of the booking',
    type: String,
    format: 'date-time',
    example: '2026-09-15T17:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDateTime: Date;

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
