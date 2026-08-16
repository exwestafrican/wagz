import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Device } from '@/generated/prisma/client';
import { existsInDbError } from '@/common/error-type';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';
import { generateDeviceApiKey, hashDeviceApiKey } from '@/fahari/auth/device-api-key';

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

  constructor(private readonly prismaService: PrismaService) {}

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

  async recordLocations(
    deviceId: string,
    locationPings: LocationPingInput[],
  ): Promise<{ count: number }> {
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
