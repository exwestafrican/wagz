import { Coordinate } from '@/fahari/tracker/type';

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceInMeters(from: Coordinate, to: Coordinate) {
  const earthRadiusKm = 6371;

  const fromLatitudeRadians = toRadians(from.latitude);
  const toLatitudeRadians = toRadians(to.latitude);

  const latitudeDifferenceRadians = toRadians(to.latitude - from.latitude);

  const longitudeDifferenceRadians = toRadians(to.longitude - from.longitude);

  const haversine =
    Math.sin(latitudeDifferenceRadians / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDifferenceRadians / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * angularDistance * 1_000;
}
