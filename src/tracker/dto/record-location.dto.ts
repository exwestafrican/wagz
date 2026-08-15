import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_LOCATION_PINGS_PER_REQUEST } from '@/tracker/const';

export class LocationPingDto {
  @ApiProperty({
    description: 'Latitude in decimal degrees',
    example: 6.5244,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude in decimal degrees',
    example: 3.3792,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Speed in meters per second',
    example: 12.5,
  })
  @IsNumber()
  @Min(0)
  speed: number;

  @ApiProperty({
    description: 'When the device captured this point',
    type: String,
    format: 'date-time',
    example: '2026-08-15T20:01:02.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  capturedAt: Date;
}

export class RecordLocationsDto {
  @ApiProperty({
    description: 'Path points to record for the authenticated device',
    type: [LocationPingDto],
    minItems: 1,
    maxItems: MAX_LOCATION_PINGS_PER_REQUEST,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LOCATION_PINGS_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => LocationPingDto)
  locations: LocationPingDto[];
}
