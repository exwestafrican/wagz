import { Injectable, Logger } from '@nestjs/common';
import { Coordinate } from '@/fahari/tracker/type';
import { PrismaService } from '@/prisma/prisma.service';
import { Geofence, Location } from '@/generated/prisma/client';
import { LocationPing } from '@/fahari/tracker/tracker.service';
import { last } from '@/common/utils';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';
import { distanceInMeters } from '@/fahari/tracker/utils/geo.utils';

@Injectable()
export default class GeofenceService {
  logger = new Logger(GeofenceService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async setupWithDefault(
    deviceId: string,
    tag: string,
    latitude: number,
    longitude: number,
  ) {
    const data = {
      deviceId: deviceId,
      tag: tag,
      latitude: new Decimal(latitude),
      longitude: new Decimal(longitude),
      // location: 'Home',
      // latitude: 6.497747,
      // longitude: 3.381939,
      radiusMeters: 75,
      transitionZoneMeters: 12,
    };
    return this.prismaService.geofence.create({
      data: data,
    });
  }

  private distanceFromFenceInMeters(
    coordinates: Coordinate,
    geoFence: Geofence,
  ) {
    return distanceInMeters(coordinates, {
      longitude: geoFence.longitude.toNumber(),
      latitude: geoFence.latitude.toNumber(),
    });
  }

  async previouslyInFence(
    deviceId: string,
    savedPings: Location[],
    receivedPings: LocationPing[],
  ): Promise<boolean> {
    const state = await this.prismaService.eventLog.findFirst({
      where: {
        deviceId: deviceId,
      },
    });

    if (state) {
      return state.inGeofence;
    } else {
      return this.currentlyInFence(deviceId, savedPings, receivedPings, false);
    }
  }

  async currentlyInFence(
    deviceId: string,
    savedPings: Location[],
    receivedPings: LocationPing[],
    previouslyInFence: boolean,
  ) {
    const saveGeofenceLocations: Geofence[] =
      await this.prismaService.geofence.findMany({
        where: {
          deviceId,
        },
      });

    const previousCoordinates = savedPings.map((ping) => ({
      longitude: ping.longitude.toNumber(),
      latitude: ping.latitude.toNumber(),
    }));

    const currentCoordinates = receivedPings.map((ping) => ({
      longitude: ping.longitude,
      latitude: ping.latitude,
    }));

    const coordinates = [...previousCoordinates, ...currentCoordinates];

    const currentFence: Geofence | undefined = this.fence(
      saveGeofenceLocations,
      coordinates,
      previouslyInFence,
    );

    return !!currentFence;
  }

  fence(
    geofence: Geofence[],
    coordinates: Coordinate[],
    previouslyInFence: boolean,
  ): Geofence | undefined {
    const mostRecentCoordinate = last(coordinates);

    if (!mostRecentCoordinate) throw new Error('Pings cannot be empty');

    return geofence.find((fence: Geofence) => {
      const distanceInMeters = this.distanceFromFenceInMeters(
        mostRecentCoordinate,
        fence,
      );

      if (distanceInMeters <= fence.radiusMeters) {
        return fence;
      }

      // if in transition zone and was previously in fence
      if (
        distanceInMeters > fence.radiusMeters &&
        distanceInMeters <= fence.radiusMeters + fence.transitionZoneMeters &&
        previouslyInFence
      ) {
        return fence;
      }
    });
  }
}
