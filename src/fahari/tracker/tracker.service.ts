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
import GeoFence, { GeoFenceStatus } from '@/fahari/tracker/domain/geo-fence';

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

    const position = this.geoFencingService.getPosition(
      deviceId,
      coordinates,
      this.geoFence(),
    ); // pass in last know state

    // we should do this for every fence i.e home, work, generic
    const wasInFence = false; //TODO fetch this from vechile state
    const isInFence = position === GeoFenceStatus.IN_FENCE;

    if (wasInFence && isInFence) {
      return { count: 0 }; // skip don't record //TODO: add test
    }

    const result = await this.prismaService.location.createMany({
      data: locationPings.map((locationPing) => ({
        deviceId,
        latitude: locationPing.latitude,
        longitude: locationPing.longitude,
        speed: locationPing.speed,
        timestamp: locationPing.capturedAt,
      })),
    });

    this.logger.log(
      `recorded locations count=${result.count} deviceId=${deviceId}`,
    );
    return { count: result.count };
  }
}
