import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { TrackerService } from '@/fahari/tracker/tracker.service';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';
import { hashDeviceApiKey } from '@/fahari/auth/device-api-key';

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
    it('creates an active device with a hashed api key on device_api_key', async () => {
      const imei = faker.string.numeric(15);

      const { device, apiKey } = await trackerService.registerDevice(imei);

      expect(device.imei).toBe(imei);
      expect(apiKey).toMatch(/^trk_/);
      expect(
        await prismaService.device.findUnique({ where: { id: device.id } }),
      ).toMatchObject({
        imei,
        isActive: true,
      });
      expect(
        await prismaService.deviceApiKey.findFirstOrThrow({
          where: { deviceId: device.id, isActive: true },
        }),
      ).toMatchObject({
        keyHash: hashDeviceApiKey(apiKey),
        isActive: true,
        revokedAt: null,
      });
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

  describe('rotateDeviceApiKey', () => {
    it('revokes the previous key and issues a new active key', async () => {
      const { device, apiKey: previousApiKey } =
        await trackerService.registerDevice(faker.string.numeric(15));

      const { apiKey: rotatedApiKey } = await trackerService.rotateDeviceApiKey(
        device.id,
      );

      expect(rotatedApiKey).toMatch(/^trk_/);
      expect(rotatedApiKey).not.toBe(previousApiKey);

      const revokedCredential =
        await prismaService.deviceApiKey.findFirstOrThrow({
          where: { keyHash: hashDeviceApiKey(previousApiKey) },
        });
      expect(revokedCredential.isActive).toBe(false);
      expect(revokedCredential.revokedAt).not.toBeNull();

      const activeCredential =
        await prismaService.deviceApiKey.findFirstOrThrow({
          where: { deviceId: device.id, isActive: true },
        });
      expect(activeCredential.keyHash).toBe(hashDeviceApiKey(rotatedApiKey));
      expect(
        await prismaService.deviceApiKey.count({
          where: { deviceId: device.id, isActive: true },
        }),
      ).toBe(1);
    });

    it('throws NotFoundInDb when device does not exist', async () => {
      await expect(
        trackerService.rotateDeviceApiKey('missing-device-id'),
      ).rejects.toBeInstanceOf(NotFoundInDb);
    });
  });

  describe('listDevices', () => {
    it('returns registered devices newest first', async () => {
      const { device: olderDevice } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const { device: newerDevice } = await trackerService.registerDevice(
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

  describe('recordLocations', () => {
    it('appends location pings with speed and capturedAt for a device', async () => {
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const capturedAt = new Date('2026-08-15T20:01:02.000Z');

      const result = await trackerService.recordLocations(device.id, [
        {
          latitude: 6.5244,
          longitude: 3.3792,
          speed: 12.5,
          capturedAt,
        },
      ]);

      expect(result).toEqual({ count: 1 });

      const persistedLocation = await prismaService.location.findFirstOrThrow({
        where: { deviceId: device.id },
      });
      expect(Number(persistedLocation.latitude)).toBeCloseTo(6.5244);
      expect(Number(persistedLocation.longitude)).toBeCloseTo(3.3792);
      expect(Number(persistedLocation.speed)).toBeCloseTo(12.5);
      expect(persistedLocation.timestamp.toISOString()).toBe(
        capturedAt.toISOString(),
      );
    });
  });
});
