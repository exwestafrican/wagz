import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { LocationPing, TrackerService } from '@/fahari/tracker/tracker.service';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';
import { hashDeviceApiKey } from '@/fahari/auth/device-api-key';
import { addMinutes } from 'date-fns/addMinutes';
import { addSeconds } from 'date-fns';
import GeofenceService from '@/fahari/tracker/geofence.service';
import { firstOrThrow } from '@/common/utils';
import { EventLog } from '@/generated/prisma/client';

describe('TrackerService', () => {
  const homeCoordinates = {
    latitude: 6.5244,
    longitude: 3.3792,
  };
  const currentTime = new Date('2026-08-15T20:01:02.000Z');

  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;
  let geofenceService: GeofenceService;
  let nowSpy: jest.SpiedFunction<typeof Date.now>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    geofenceService = new GeofenceService(prismaService);
    trackerService = new TrackerService(prismaService, geofenceService);
    nowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  function createFakePings(count: number, capturedAt: Date): LocationPing[] {
    return Array.from({ length: count }, (_, i) => ({
      latitude: 6.5244 + i * 0.05,
      longitude: 3.3792 + i * 0.51,
      speed: 12.5,
      capturedAt: addSeconds(capturedAt, i * 2),
    }));
  }

  function createStaticPings(
    latitude: number,
    longitude: number,
    count: number,
    capturedAt: Date,
  ): LocationPing[] {
    return Array.from({ length: count }, (_, i) => ({
      latitude: latitude,
      longitude: longitude,
      speed: 12.5,
      capturedAt: addSeconds(capturedAt, i * 2),
    }));
  }

  function assertInGeofence(eventLog: EventLog) {
    expect(eventLog.inGeofence).toBeTruthy();
  }

  function assertNotInGeofence(eventLog: EventLog) {
    expect(eventLog.inGeofence).toBeFalsy();
  }

  function assertNotMoving(eventLog: EventLog) {
    expect(eventLog.isMoving).toBeFalsy();
  }

  function assertMoving(eventLog: EventLog) {
    expect(eventLog.isMoving).toBeTruthy();
  }

  async function setupGeoFence(
    deviceId: string,
    tag: string,
    latitude: number,
    longitude: number,
  ) {
    return geofenceService.setupWithDefault(deviceId, tag, latitude, longitude);
  }

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

    it('records location and vehicle state if first ping', async () => {
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const capturedAt = new Date('2026-08-15T20:01:02.000Z');

      await trackerService.recordLocations(device.id, [
        {
          latitude: 6.5244,
          longitude: 3.3792,
          speed: 12.5,
          capturedAt,
        },
      ]);

      const persistedLocation = await prismaService.location.findFirstOrThrow({
        where: { deviceId: device.id },
      });

      expect(persistedLocation).not.toBeNull();
      const eventLog = await prismaService.eventLog.findMany({
        where: { deviceId: device.id },
      });

      assertNotInGeofence(firstOrThrow(eventLog));
    });

    it("doesn't record location if captured at is stale", async () => {
      const capturedAt = new Date('2026-08-15T20:01:02.000Z');
      nowSpy.mockReturnValue(capturedAt.getUTCMilliseconds());

      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      await trackerService.recordLocations(device.id, [
        {
          latitude: 6.5244,
          longitude: 3.3792,
          speed: 12.5,
          capturedAt: addMinutes(capturedAt, 2),
        },
      ]);

      await trackerService.recordLocations(device.id, [
        {
          latitude: 6.5244,
          longitude: 3.3792,
          speed: 13.5,
          capturedAt: capturedAt,
        },
      ]);

      const persistedLocations = await prismaService.location.findMany({
        where: { deviceId: device.id },
      });

      expect(persistedLocations.length).toEqual(1);
    });

    it('records pings when not in fence and moving', async () => {
      const capturedAt = new Date('2026-08-15T20:01:02.000Z');

      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      await trackerService.recordLocations(device.id, [
        {
          latitude: 6.5244,
          longitude: 3.3792,
          speed: 12.5,
          capturedAt: addSeconds(capturedAt, 1),
        },
        {
          latitude: 6.5245,
          longitude: 3.3793,
          speed: 10,
          capturedAt: addSeconds(capturedAt, 2),
        },
        {
          latitude: 6.5246,
          longitude: 3.3795,
          speed: 5,
          capturedAt: addSeconds(capturedAt, 3),
        },
      ]);

      const persistedLocations = await prismaService.location.findMany({
        where: { deviceId: device.id },
      });

      expect(persistedLocations.length).toEqual(3);
    });

    //TODO: test multiple fence

    it('writes into event log when vehicle state changes', async () => {
      const currentTime = new Date('2026-08-15T20:01:02.000Z');
      nowSpy.mockReturnValue(currentTime.getTime());

      const latitude = 6.5244;
      const longitude = 3.3792;

      //setup
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      const home = await setupGeoFence(device.id, 'Home', latitude, longitude);

      const pings_t1 = createFakePings(10, addMinutes(currentTime, 10));
      const pings_t2 = createFakePings(50, addMinutes(currentTime, 12));

      const pings_t3 = createFakePings(40, addMinutes(currentTime, 15));

      const pings_t4 = createStaticPings(
        home.latitude.toNumber(),
        home.longitude.toNumber(),
        3,
        addMinutes(currentTime, 25),
      ); // home

      await trackerService.recordLocations(device.id, pings_t1);
      await trackerService.recordLocations(device.id, pings_t2);
      await trackerService.recordLocations(device.id, pings_t3);
      await trackerService.recordLocations(device.id, pings_t4);

      const eventLog = await prismaService.eventLog.findMany({
        where: { deviceId: device.id },
      });

      expect(eventLog).toHaveLength(3);

      assertNotInGeofence(eventLog[0]);
      assertNotInGeofence(eventLog[1]);
      assertInGeofence(eventLog[2]);

      assertNotMoving(eventLog[0]);
      assertMoving(eventLog[1]);
      assertMoving(eventLog[2]);
    });

    it('saves ping if in geo fence for longer than or equal to heartbeat minutes', async () => {
      nowSpy.mockReturnValue(currentTime.getTime());

      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      await setupGeoFence(
        device.id,
        'Home',
        homeCoordinates.latitude,
        homeCoordinates.longitude,
      );

      const pings_t1 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        currentTime,
      );
      const pings_t2 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 1),
      );
      const pings_t3 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 4),
      );
      const pings_t4 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 5),
      );
      const pings_t5 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 12),
      );
      const pings_t6 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 15),
      );
      const pings_t7 = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        20,
        addMinutes(currentTime, 20),
      );

      await trackerService.recordLocations(device.id, pings_t1);
      await trackerService.recordLocations(device.id, pings_t2);
      await trackerService.recordLocations(device.id, pings_t3);
      await trackerService.recordLocations(device.id, pings_t4);
      await trackerService.recordLocations(device.id, pings_t5);
      await trackerService.recordLocations(device.id, pings_t6);
      await trackerService.recordLocations(device.id, pings_t7);

      const persistedLocations = await prismaService.location.findMany({
        where: { deviceId: device.id },
      });

      expect(persistedLocations).toHaveLength(23);
    });

    it('saves heartbeat ping when no movement', async () => {});

    // updates state change
    it('saves heartbeat ping when no movement', async () => {
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const parked = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        10,
        currentTime,
      );
      await trackerService.recordLocations(device.id, parked);
      const tooSoon = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        3,
        addMinutes(currentTime, 1),
      );
      await expect(
        trackerService.recordLocations(device.id, tooSoon),
      ).resolves.toEqual({ count: 0 });

      const heartbeat = createStaticPings(
        homeCoordinates.latitude,
        homeCoordinates.longitude,
        3,
        addMinutes(currentTime, 6),
      );

      await trackerService.recordLocations(device.id, heartbeat);

      expect(
        await prismaService.location.count({ where: { deviceId: device.id } }),
      ).toBe(11);
      expect(
        await prismaService.eventLog.count({ where: { deviceId: device.id } }),
      ).toBe(1);
    });

    it('records location and state change when currently still but was previously moving', async () => {
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      const bootstrap = createFakePings(10, currentTime);

      const moving = createFakePings(5, addMinutes(currentTime, 1));

      const parkLatitude = 6.5244 + 4 * 0.05;
      const parkLongitude = 3.3792 + 4 * 0.51;

      const settling = createStaticPings(
        parkLatitude,
        parkLongitude,
        3,
        addMinutes(currentTime, 2),
      );

      const parked = createStaticPings(
        parkLatitude,
        parkLongitude,
        3,
        addMinutes(currentTime, 3),
      );

      await trackerService.recordLocations(device.id, bootstrap);
      await trackerService.recordLocations(device.id, moving);
      await trackerService.recordLocations(device.id, settling);
      await trackerService.recordLocations(device.id, parked);

      const eventLogs = await prismaService.eventLog.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'asc' },
      });

      assertNotMoving(eventLogs[0]); // bootstrap
      assertMoving(eventLogs[1]); // after moving batch
      assertNotMoving(eventLogs[eventLogs.length - 1]); // stopped
    });
  });
});
