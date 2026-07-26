import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { TrackerService } from '@/tracker/tracker.service';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';

describe('TrackerService', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    trackerService = new TrackerService(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('registerDevice', () => {
    it('creates a device for a new imei', async () => {
      const imei = faker.string.numeric(15);

      const device = await trackerService.registerDevice(imei);

      expect(device.imei).toBe(imei);
      expect(
        await prismaService.device.findUnique({ where: { id: device.id } }),
      ).toMatchObject({ imei });
    });

    it('throws ItemAlreadyExistsInDb when imei is already registered', async () => {
      const imei = faker.string.numeric(15);
      await trackerService.registerDevice(imei);

      await expect(trackerService.registerDevice(imei)).rejects.toBeInstanceOf(
        ItemAlreadyExistsInDb,
      );
      expect(await prismaService.device.count({ where: { imei } })).toBe(1);
    });
  });

  describe('listDevices', () => {
    it('returns registered devices newest first', async () => {
      const olderDevice = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const newerDevice = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      const devices = await trackerService.listDevices();

      expect(devices.map((device) => device.id)).toEqual([
        newerDevice.id,
        olderDevice.id,
      ]);
    });

    it('returns an empty list when no devices are registered', async () => {
      await expect(trackerService.listDevices()).resolves.toEqual([]);
    });
  });

  describe('recordLocation', () => {
    it('appends a location for a registered device', async () => {
      const device = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const latitude = 6.5244;
      const longitude = 3.3792;

      const location = await trackerService.recordLocation(
        device.id,
        latitude,
        longitude,
      );

      expect(location.deviceId).toBe(device.id);
      expect(Number(location.latitude)).toBeCloseTo(latitude);
      expect(Number(location.longitude)).toBeCloseTo(longitude);
      expect(
        await prismaService.location.count({ where: { deviceId: device.id } }),
      ).toBe(1);
    });

    it('throws NotFoundInDb when device does not exist', async () => {
      await expect(
        trackerService.recordLocation('missing-device-id', 6.5244, 3.3792),
      ).rejects.toBeInstanceOf(NotFoundInDb);

      expect(await prismaService.location.count()).toBe(0);
    });
  });
});
