import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Location } from '@/generated/prisma/client';

export class LocationResponseDto {
  @ApiProperty({ description: 'Location record id' })
  id: string;

  @ApiProperty({ description: 'Device id' })
  deviceId: string;

  @ApiProperty({ description: 'Latitude in decimal degrees' })
  latitude: number;

  @ApiProperty({ description: 'Longitude in decimal degrees' })
  longitude: number;

  @ApiPropertyOptional({
    description: 'Speed in meters per second',
    nullable: true,
  })
  speed: number | null;

  @ApiProperty({ description: 'When the device captured this point' })
  timestamp: Date;
}

export function toLocationResponse(location: Location): LocationResponseDto {
  return {
    id: location.id,
    deviceId: location.deviceId,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    speed: location.speed === null ? null : Number(location.speed),
    timestamp: location.timestamp,
  };
}
