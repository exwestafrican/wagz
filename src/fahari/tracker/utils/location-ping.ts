import { Location } from '@/generated/prisma/client';
import { LocationPing } from '@/fahari/tracker/tracker.service';
import { Coordinate } from '@/fahari/tracker/type';

export function toLocationPings(locations: Location[]): LocationPing[] {
  return locations.map((location) => toLocationPing(location));
}

export function toLocationPing(location: Location): LocationPing {
  return {
    latitude: location.latitude.toNumber(),
    longitude: location.longitude.toNumber(),
    speed: location.speed.toNumber(),
    capturedAt: location.timestamp,
  };
}

export function toCoordinate(ping: LocationPing): Coordinate {
  return {
    latitude: ping.latitude,
    longitude: ping.longitude,
  };
}
