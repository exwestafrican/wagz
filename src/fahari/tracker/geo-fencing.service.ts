import { Injectable, Logger } from '@nestjs/common';
import GeoFence, {
  Coordinate,
  GeoFenceResult,
  GeoFenceStatus,
} from '@/fahari/tracker/domain/geo-fence';

@Injectable()
export class GeoFencingService {
  logger = new Logger(GeoFencingService.name);

  check(coordinates: Coordinate): GeoFenceResult {
    //TODO: take in coordinates and geofence

    const geoFence: GeoFence = {
      location: 'Home',
      latitude: 6.497747,
      longitude: 3.381939,
      radiusMeters: 75,
      transitionZoneMeters: 12,
    };

    const distanceInMeters = this.distanceInMeters(coordinates, {
      longitude: geoFence.longitude,
      latitude: geoFence.latitude,
    });

    if (distanceInMeters <= geoFence.radiusMeters) {
      return {
        status: GeoFenceStatus.IN_FENCE,
        distanceInMeters,
      };
    } else if (
      distanceInMeters > geoFence.radiusMeters &&
      distanceInMeters <= geoFence.radiusMeters + geoFence.transitionZoneMeters
    ) {
      return {
        status: GeoFenceStatus.TRANSITIONING,
        distanceInMeters,
      };
    } else {
      return {
        status: GeoFenceStatus.OUTSIDE_FENCE,
        distanceInMeters,
      };
    }
  }

  private toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  private distanceInMeters(from: Coordinate, to: Coordinate) {
    const earthRadiusKm = 6371;

    const fromLatitudeRadians = this.toRadians(from.latitude);
    const toLatitudeRadians = this.toRadians(to.latitude);

    const latitudeDifferenceRadians = this.toRadians(
      to.latitude - from.latitude,
    );

    const longitudeDifferenceRadians = this.toRadians(
      to.longitude - from.longitude,
    );

    const haversine =
      Math.sin(latitudeDifferenceRadians / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDifferenceRadians / 2) ** 2;

    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusKm * angularDistance * 1_000;
  }
}
