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
import { GeoFencingService } from '@/fahari/tracker/geo-fencing.service';
import {
  geofenceOrThrow,
  geoFenceStatus,
  GeoFenceStatus,
  GeoTag,
} from '@/fahari/tracker/domain/geo-fence';
import { subMinutes } from 'date-fns';
import { mode } from '@/common/utils';

export type RegisteredDevice = {
  device: Device;
  apiKey: string;
};

export type LocationPingInput = {
  latitude: number;
  longitude: number;
  speed: number;
  capturedAt: Date;
};

@Injectable()
export class TrackerService {
  logger = new Logger(TrackerService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly geoFencingService: GeoFencingService,
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

  private geoFence() {
    return {
      location: 'Home',
      latitude: 6.497747,
      longitude: 3.381939,
      radiusMeters: 75,
      transitionZoneMeters: 12,
    };
  }

  async recordLocations(
    deviceId: string,
    locationPings: LocationPingInput[],
  ): Promise<{ count: number }> {
    const coordinates = locationPings.map((locationPing) => ({
      longitude: locationPing.longitude,
      latitude: locationPing.latitude,
    }));

    const geoFence = geofenceOrThrow(GeoTag.HOME);
    const fifteenMinutesAgo = subMinutes(Date.now(), 15);
    const pastLocations = await this.prismaService.location.findMany({
      where: {
        deviceId: deviceId,
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // if pastLocations.length > 0 do this else

    if (pastLocations.length > 1) {
      const mostRecentLocation = pastLocations[pastLocations.length - 1];

      const deviceState = await this.prismaService.deviceState.findFirstOrThrow(
        {
          where: {
            id: mostRecentLocation.deviceStateId,
          },
        },
      ); //TOOD: use a join to get this

      const position = this.geoFencingService.getPosition(
        deviceState,
        coordinates,
        geoFence,
      );

      const wasInFence =
        geoFenceStatus(deviceState.geoTag) === GeoFenceStatus.IN_FENCE;

      const isInFence = position === GeoFenceStatus.IN_FENCE;

      if (wasInFence && isInFence) {
        this.logger.log(
          `Skipping device because is in fence; deviceId=${deviceId}`,
        );
        return { count: 0 }; // skip don't record //TODO: add test
      }

      const mostOccurringSpeed = mode(pastLocations.map((l) => l.speed));

      const isParked = mostOccurringSpeed.lessThanOrEqualTo(2); //TODO: confim the unit the speed comes in also should i consider distance

      if (isParked) {
        this.logger.log(
          `Skipping device because is parked; deviceId=${deviceId}`,
        );
        return { count: 0 };
      }

      const createResult = await this.prismaService.location.createMany({
        data: locationPings.map((locationPing) => ({
          deviceId,
          latitude: locationPing.latitude,
          longitude: locationPing.longitude,
          speed: locationPing.speed,
          timestamp: locationPing.capturedAt,
          deviceStateId: 1, // TODO: create device state if needed
        })),
      });

      this.logger.log(
        `recorded locations count=${createResult.count} deviceId=${deviceId}`,
      );
      return { count: createResult.count };
    }

  }

  //
  // async recordLocations(
  //   deviceId: string,
  //   locationPings: LocationPingInput[],
  // ): Promise<{ count: number }> {
  //   const coordinates = locationPings.map((locationPing) => ({
  //     longitude: locationPing.longitude,
  //     latitude: locationPing.latitude,
  //   }));
  //   // fetch latest tag and use that to check.
  //   // for each geoFence check if wasInFence && isInFence
  //
  //   // assume everyone only has one geoTag
  //
  //   const geoFence = geofenceOrThrow(GeoTag.HOME);
  //
  //   const deviceState: DeviceState[] =
  //     await this.prismaService.deviceState.findMany({
  //       where: { deviceId: deviceId },
  //       orderBy: {
  //         createdAt: 'desc',
  //       },
  //       take: 1,
  //     });
  //
  //   const mostRecentState: DeviceState | undefined = deviceState.at(0);
  //
  //   if (mostRecentState) {
  //     const position = this.geoFencingService.getPosition(
  //       mostRecentState,
  //       coordinates,
  //       geoFence,
  //     );
  //
  //     // we should do this for every fence i.e home, work, generic
  //     const wasInFence = mostRecentState.geoTag === geoFence.tag; //TODO fetch this from vehicle state // state.tag ===  geoFence.tag
  //     const isInFence = position === GeoFenceStatus.IN_FENCE;
  //
  //     if (wasInFence && isInFence) {
  //       return { count: 0 }; // skip don't record //TODO: add test
  //     }
  //
  //
  //     else {
  //       const result = await this.prismaService.location.createMany({
  //         data: locationPings.map((locationPing) => ({
  //           deviceId,
  //           latitude: locationPing.latitude,
  //           longitude: locationPing.longitude,
  //           speed: locationPing.speed,
  //           timestamp: locationPing.capturedAt,
  //         })),
  //       });
  //
  //       this.logger.log(
  //         `recorded locations count=${result.count} deviceId=${deviceId}`,
  //       );
  //       return { count: result.count };
  //     }
  //   } else {
  //     const result = await this.prismaService.location.createMany({
  //       data: locationPings.map((locationPing) => ({
  //         deviceId,
  //         latitude: locationPing.latitude,
  //         longitude: locationPing.longitude,
  //         speed: locationPing.speed,
  //         timestamp: locationPing.capturedAt,
  //       })),
  //     });
  //
  //     this.logger.log(
  //       `recorded locations count=${result.count} deviceId=${deviceId}`,
  //     );
  //     return { count: result.count };
  //   }
  // }
}

// isIdel o
