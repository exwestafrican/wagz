import { Injectable, Logger } from '@nestjs/common';
import GeoFence, {
  Coordinate,
  GeofenceDirection,
  GeoFenceResult,
  geoFenceStatus,
  GeoFenceStatus,
} from '@/fahari/tracker/domain/geo-fence';
import { DeviceState } from '@/generated/prisma/client';

@Injectable()
export class GeoFencingService {
  logger = new Logger(GeoFencingService.name);
  //
  // shouldPersistCoordinates

  //take in the deviceId, newCoordinates, the geoFence. assume we can only geo fence one place per device for now
  getPosition(
    deviceState: DeviceState,
    coordinates: Coordinate[],
    geoFence: GeoFence,
  ) {
    //TODO: test this
    const currentCoordinate = coordinates[coordinates.length - 1];
    const result = this.check(currentCoordinate, geoFence);
    const deviceGeoTag: string = deviceState.geoTag;

    if (result.status === GeoFenceStatus.TRANSITIONING) {
      const movementDirection = this.getGeofenceDirection(
        coordinates,
        geoFence,
      );

      if (movementDirection === GeofenceDirection.AWAY_FROM_GEOFENCE) {
        return GeoFenceStatus.IN_FENCE; // we can assume car is still home
      } else if (movementDirection === GeofenceDirection.TOWARDS_GEOFENCE) {
        return GeoFenceStatus.OUTSIDE_FENCE; // care is outside but heading home
      } else {
        return geoFenceStatus(deviceGeoTag);
      }
    }

    return result.status;
  }

  getGeofenceDirection(coordinates: Coordinate[], geoFence: GeoFence) {
    //enforce minimum coordinates  collection period to be 30 secs
    //TODO Add test for all three senariaos
    const distanceFromGeoFenceInMeters = coordinates.map(
      (previousCoordinate) =>
        this.distanceInMeters(previousCoordinate, {
          longitude: geoFence.longitude,
          latitude: geoFence.latitude,
        }), //todo move this to helper function
    );

    // if distance is reducing car is moving towards geofence
    // if distance is increasing car is moving away
    let movingDirection = 0;

    for (
      let currentIndex = 1;
      currentIndex < distanceFromGeoFenceInMeters.length;
      currentIndex++
    ) {
      const previousIndex = currentIndex - 1;
      const currentDistance = distanceFromGeoFenceInMeters[currentIndex];
      const previousDistance = distanceFromGeoFenceInMeters[previousIndex];
      if (currentDistance > previousDistance) {
        movingDirection = movingDirection + 1; // moving away because distance increases
      } else if (currentDistance < previousDistance) {
        movingDirection = movingDirection - 1; // moving towards because distance reduces
      }
    }

    if (movingDirection < 0) {
      return GeofenceDirection.TOWARDS_GEOFENCE;
    } else if (movingDirection > 0) {
      return GeofenceDirection.AWAY_FROM_GEOFENCE;
    } else {
      return GeofenceDirection.STATIONARY;
    }
  }

  check(coordinates: Coordinate, geoFence: GeoFence): GeoFenceResult {
    //TODO: take in coordinates and geofence
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
