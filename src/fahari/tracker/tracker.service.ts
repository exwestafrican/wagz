import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Device } from '@/generated/prisma/client';
import { existsInDbError } from '@/common/error-type';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';
import {
  generateDeviceApiKey,
  hashDeviceApiKey,
} from '@/fahari/auth/device-api-key';
import { differenceInSeconds } from 'date-fns';
import {
  first,
  firstOrThrow,
  isEmpty,
  last,
  lastOrThrow,
} from '@/common/utils';
import { Location } from '@/generated/prisma/client';
import GeofenceService from '@/fahari/tracker/geofence.service';
import {
  averageSpeedMs,
  totalDistanceMoved,
} from '@/fahari/tracker/domain/vehicle';
import { toLocationPings } from '@/fahari/tracker/utils/location-ping';

export type RegisteredDevice = {
  device: Device;
  apiKey: string;
};

export type LocationPing = {
  latitude: number;
  longitude: number;
  speed: number;
  capturedAt: Date;
};

const HEART_INTERVAL_IN_MINUTES = 5;
const MINIMUM_DISTANCE_MOVED_IN_METERS = 8;
const MINIMUM_AVERAGE_SPEED_MS = 2.5;
const BOOTSTRAP_PING_COUNT = 10; // minimum number of pings we need to ingest from device before we every check; - don't go below 2. Be careful when replacing

type State = {
  inFence: boolean;
  isMoving: boolean;
};
@Injectable()
export class TrackerService {
  logger = new Logger(TrackerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly geofenceService: GeofenceService,
  ) {}

  async registerDevice(imei: string): Promise<RegisteredDevice> {
    const apiKey = generateDeviceApiKey();
    const keyHash = hashDeviceApiKey(apiKey);

    try {
      const device = await this.prismaService.device.create({
        data: {
          imei,
          isActive: true,
          apiKeys: {
            create: { keyHash },
          },
        },
      });
      this.logger.log(`registered device id=${device.id} imei=${imei}`);
      return { device, apiKey };
    } catch (error) {
      if (existsInDbError(error)) {
        throw new ItemAlreadyExistsInDb(
          `device with imei already exists; imei=${imei}`,
        );
      }
      throw error;
    }
  }

  async rotateDeviceApiKey(deviceId: string): Promise<RegisteredDevice> {
    const device = await this.prismaService.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundInDb(`device not found; deviceId=${deviceId}`);
    }

    const apiKey = generateDeviceApiKey();
    const keyHash = hashDeviceApiKey(apiKey);
    const revokedAt = new Date();

    await this.prismaService.$transaction([
      this.prismaService.deviceApiKey.updateMany({
        where: { deviceId, isActive: true },
        data: { isActive: false, revokedAt },
      }),
      this.prismaService.deviceApiKey.create({
        data: { deviceId, keyHash },
      }),
    ]);

    this.logger.log(`rotated api key for device id=${deviceId}`);
    return { device, apiKey };
  }

  async listDevices(): Promise<Device[]> {
    return this.prismaService.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private async lastNPings(
    deviceId: string,
    limit: number,
  ): Promise<Location[]> {
    //Example: https://github.com/exwestafrican/wagz/pull/314#issuecomment-5551925750
    const locations = await this.prismaService.location.findMany({
      where: {
        deviceId: deviceId,
      },
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    });
    return locations.reverse();
  }

  private async writeLocationsToDb(
    deviceId: string,
    locationPings: LocationPing[],
  ) {
    const locations = await this.prismaService.location.createManyAndReturn({
      data: locationPings.map((locationPing) => ({
        deviceId,
        latitude: locationPing.latitude,
        longitude: locationPing.longitude,
        speed: locationPing.speed,
        timestamp: locationPing.capturedAt,
      })),
    });

    this.logger.log(
      `recorded locations count=${locations.length} deviceId=${deviceId}`,
    );
    return locations;
  }

  private capturedAt(location: Location) {
    return location.timestamp;
  }

  private isBehindLastSavedPing(
    savedPings: Location[],
    locationPings: LocationPing[],
  ) {
    const recentlySavedPing = last(savedPings);
    const currentPing = first(locationPings);
    return (
      recentlySavedPing &&
      currentPing &&
      this.capturedAt(recentlySavedPing) >= currentPing.capturedAt
    );
  }

  private async writeEventLog(
    deviceId: string,
    anchorLocation: Location,
    inGeofence: boolean,
    isMoving: boolean,
  ) {
    return this.prismaService.eventLog.create({
      data: {
        deviceId: deviceId,
        locationId: anchorLocation.id,
        inGeofence: inGeofence,
        isMoving: isMoving,
      },
    });
  }

  statesEqual(a: State, b: State): boolean {
    return a.inFence === b.inFence && a.isMoving === b.isMoving;
  }

  private async writeIfStateChanged(
    deviceId: string,
    anchorLocation: Location,
    previous: State,
    current: State,
  ) {
    if (!this.statesEqual(previous, current)) {
      await this.writeEventLog(
        deviceId,
        anchorLocation,
        current.inFence,
        current.isMoving,
      );
    }
  }

  private async saveHeartBeatOrDrop(
    deviceId: string,
    pastPings: Location[],
    receivedPings: LocationPing[],
  ) {
    const mostRecentlySavedPing = lastOrThrow(pastPings);
    const mostRecentlyReceivedPing = lastOrThrow(receivedPings);

    const secondsPastSinceLastCapture = differenceInSeconds(
      mostRecentlyReceivedPing.capturedAt,
      this.capturedAt(mostRecentlySavedPing),
    );

    if (secondsPastSinceLastCapture < HEART_INTERVAL_IN_MINUTES * 60) return 0;

    const locations = await this.writeLocationsToDb(deviceId, [
      mostRecentlyReceivedPing,
    ]);
    return locations.length;
  }

  private isMoving(
    savedPingsWithinLookBackPeriod: Location[],
    receivedPings: LocationPing[],
  ) {
    const lastTwoSavedPings = savedPingsWithinLookBackPeriod.slice(-2);
    const pings = [...toLocationPings(lastTwoSavedPings), ...receivedPings];
    return (
      totalDistanceMoved(pings) > MINIMUM_DISTANCE_MOVED_IN_METERS &&
      averageSpeedMs(pings) > MINIMUM_AVERAGE_SPEED_MS
    );
  }

  async recordLocations(
    deviceId: string,
    receivedPings: LocationPing[],
  ): Promise<{ count: number }> {
    const previousTenPings = await this.lastNPings(
      deviceId,
      BOOTSTRAP_PING_COUNT,
    );

    if (isEmpty(previousTenPings)) {
      return this.bootstrapLocations(deviceId, previousTenPings, receivedPings);
    }

    if (this.isBehindLastSavedPing(previousTenPings, receivedPings)) {
      return { count: 0 };
    }

    const mostRecentState = await this.prismaService.eventLog.findFirstOrThrow({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    const previous = {
      inFence: mostRecentState.inGeofence,
      isMoving: mostRecentState.isMoving,
    };
    const current = {
      inFence: await this.geofenceService.currentlyInFence(
        deviceId,
        previousTenPings,
        receivedPings,
        previous.inFence,
      ),
      isMoving: this.isMoving(previousTenPings, receivedPings),
    };

    const hasEnoughData = previousTenPings.length >= BOOTSTRAP_PING_COUNT;
    const settledInFence = current.inFence && previous.inFence;
    const settledStill =
      hasEnoughData && !previous.isMoving && !current.isMoving;

    if (settledInFence || settledStill) {
      const savedCount = await this.saveHeartBeatOrDrop(
        deviceId,
        previousTenPings,
        receivedPings,
      );
      return { count: savedCount };
    }

    return this.writeAndLogStateChange(
      deviceId,
      receivedPings,
      previous,
      current,
    );
  }

  private async bootstrapLocations(
    deviceId: string,
    previousTenPings: Location[],
    receivedPings: LocationPing[],
  ): Promise<{ count: number }> {
    const currentlyInFence = await this.geofenceService.currentlyInFence(
      deviceId,
      previousTenPings,
      receivedPings,
      false, // default assume not in fence
    );
    const locations = await this.writeLocationsToDb(deviceId, receivedPings);
    const earliest = firstOrThrow(locations);
    await this.writeEventLog(deviceId, earliest, currentlyInFence, false); // assume no movement
    return { count: locations.length };
  }

  private async writeAndLogStateChange(
    deviceId: string,
    receivedPings: LocationPing[],
    previous: { inFence: boolean; isMoving: boolean },
    current: { inFence: boolean; isMoving: boolean },
  ): Promise<{ count: number }> {
    const locations = await this.writeLocationsToDb(deviceId, receivedPings);
    const earliest = firstOrThrow(locations);
    await this.writeIfStateChanged(deviceId, earliest, previous, current);
    return { count: locations.length };
  }
}
