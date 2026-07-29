import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ description: 'When the location was recorded' })
  timestamp: Date;
}

export function toLocationResponse(location: Location): LocationResponseDto {
  return {
    id: location.id,
    deviceId: location.deviceId,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    timestamp: location.timestamp,
  };
}
