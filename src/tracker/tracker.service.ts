import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Device, Location } from '@/generated/prisma/client';
import { existsInDbError } from '@/common/error-type';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';

@Injectable()
export class TrackerService {
  logger = new Logger(TrackerService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async registerDevice(imei: string): Promise<Device> {
    try {
      const device = await this.prismaService.device.create({
        data: { imei },
      });
      this.logger.log(`registered device id=${device.id} imei=${imei}`);
      return device;
    } catch (error) {
      if (existsInDbError(error)) {
        throw new ItemAlreadyExistsInDb(
          `device with imei already exists; imei=${imei}`,
        );
      }
      throw error;
    }
  }

  async listDevices(): Promise<Device[]> {
    return this.prismaService.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordLocation(
    deviceId: string,
    latitude: number,
    longitude: number,
  ): Promise<Location> {
    const device = await this.prismaService.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundInDb(`device not found; deviceId=${deviceId}`);
    }

    const location = await this.prismaService.location.create({
      data: {
        deviceId,
        latitude,
        longitude,
        timestamp: new Date(),
      },
    });
    this.logger.log(`recorded location id=${location.id} deviceId=${deviceId}`);
    return location;
  }
}
