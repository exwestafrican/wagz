import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';
import request from 'supertest';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import getHttpServer from '@/test-helpers/get-http-server';
import { resetDb } from '@/test-helpers/rest-db';
import { TrackerService } from '@/fahari/tracker/tracker.service';
import { TrackerController } from '@/fahari/tracker/tracker.controller';
import { TrackerAdminController } from '@/fahari/tracker/admin/tracker-admin.controller';
import { DeviceAuthGuard } from '@/fahari/auth/guard/device-auth.guard';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import RequestUser from '@/auth/domain/request-user';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  setupSuperAdmin,
  setupWorkspaceWithTeammate,
} from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ENVOYE_WORKSPACE_CODE } from '@/common/envoye-workspace.const';
import { ROLES } from '@/permission/types';
import { hashDeviceApiKey } from '@/fahari/auth/device-api-key';
import GeofenceService from '@/fahari/tracker/geofence.service';

describe('TrackerController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;
  let controller: TrackerController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    trackerService = new TrackerService(
      prismaService,
      new GeofenceService(prismaService),
    );
    controller = new TrackerController(trackerService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('recordLocations', () => {
    it('returns the created count for a registered device', async () => {
      const { device } = await trackerService.registerDevice(
        faker.string.numeric(15),
      );
      const capturedAt = new Date('2026-08-15T20:01:02.000Z');

      const body = await controller.recordLocations(device, {
        locations: [
          {
            latitude: 6.5244,
            longitude: 3.3792,
            speed: 12.5,
            capturedAt,
          },
          {
            latitude: 6.525,
            longitude: 3.38,
            speed: 10.1,
            capturedAt: new Date('2026-08-15T20:01:12.000Z'),
          },
        ],
      });

      expect(body).toEqual({ count: 2 });

      const persistedLocations = await prismaService.location.findMany({
        where: { deviceId: device.id },
        orderBy: { timestamp: 'asc' },
      });
      expect(persistedLocations).toHaveLength(2);
      expect(Number(persistedLocations[0].latitude)).toBeCloseTo(6.5244);
      expect(Number(persistedLocations[0].speed)).toBeCloseTo(12.5);
      expect(persistedLocations[0].timestamp.toISOString()).toBe(
        capturedAt.toISOString(),
      );
    });
  });
});

describe('TrackerController ping', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      controllers: [TrackerController],
      providers: [TrackerService, DeviceAuthGuard],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    trackerService = app.get(TrackerService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('returns 200 when the api key is valid', async () => {
    const { apiKey } = await trackerService.registerDevice(
      faker.string.numeric(15),
    );

    await request(getHttpServer(app))
      .get('/tracker/ping')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(HttpStatus.OK);
  });

  it('returns 401 when authorization header is missing', async () => {
    await request(getHttpServer(app))
      .get('/tracker/ping')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the api key is wrong', async () => {
    await trackerService.registerDevice(faker.string.numeric(15));

    await request(getHttpServer(app))
      .get('/tracker/ping')
      .set('Authorization', 'Bearer trk_not-a-real-key')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the device is inactive', async () => {
    const { device, apiKey } = await trackerService.registerDevice(
      faker.string.numeric(15),
    );
    await prismaService.device.update({
      where: { id: device.id },
      data: { isActive: false },
    });

    await request(getHttpServer(app))
      .get('/tracker/ping')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the api key has been revoked', async () => {
    const { device, apiKey: previousApiKey } =
      await trackerService.registerDevice(faker.string.numeric(15));
    const { apiKey: rotatedApiKey } = await trackerService.rotateDeviceApiKey(
      device.id,
    );

    await request(getHttpServer(app))
      .get('/tracker/ping')
      .set('Authorization', `Bearer ${previousApiKey}`)
      .expect(HttpStatus.UNAUTHORIZED);

    await request(getHttpServer(app))
      .get('/tracker/ping')
      .set('Authorization', `Bearer ${rotatedApiKey}`)
      .expect(HttpStatus.OK);
  });
});

describe('TrackerController device auth', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      controllers: [TrackerController],
      providers: [TrackerService, DeviceAuthGuard],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    trackerService = app.get(TrackerService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  const locationBatchBody = {
    locations: [
      {
        latitude: 6.5244,
        longitude: 3.3792,
        speed: 1,
        capturedAt: '2026-08-15T20:01:02.000Z',
      },
    ],
  };

  it('returns 401 when authorization header is missing', async () => {
    await request(getHttpServer(app))
      .post('/tracker/locations')
      .send(locationBatchBody)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the api key is wrong', async () => {
    await trackerService.registerDevice(faker.string.numeric(15));

    await request(getHttpServer(app))
      .post('/tracker/locations')
      .set('Authorization', 'Bearer trk_not-a-real-key')
      .send(locationBatchBody)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(await prismaService.location.count()).toBe(0);
  });

  it('returns 401 when the device is inactive', async () => {
    const { device, apiKey } = await trackerService.registerDevice(
      faker.string.numeric(15),
    );
    await prismaService.device.update({
      where: { id: device.id },
      data: { isActive: false },
    });

    await request(getHttpServer(app))
      .post('/tracker/locations')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(locationBatchBody)
      .expect(HttpStatus.UNAUTHORIZED);

    expect(await prismaService.location.count()).toBe(0);
  });

  it('returns 401 when the api key has been revoked', async () => {
    const { device, apiKey: previousApiKey } =
      await trackerService.registerDevice(faker.string.numeric(15));
    const { apiKey: rotatedApiKey } = await trackerService.rotateDeviceApiKey(
      device.id,
    );

    await request(getHttpServer(app))
      .post('/tracker/locations')
      .set('Authorization', `Bearer ${previousApiKey}`)
      .send(locationBatchBody)
      .expect(HttpStatus.UNAUTHORIZED);

    await request(getHttpServer(app))
      .post('/tracker/locations')
      .set('Authorization', `Bearer ${rotatedApiKey}`)
      .send(locationBatchBody)
      .expect(HttpStatus.CREATED);

    expect(await prismaService.location.count()).toBe(1);
  });
});

describe('TrackerAdminController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let trackerService: TrackerService;
  let adminController: TrackerAdminController;
  let factory: PersistStrategy;
  let requestUser: RequestUser;

  beforeEach(async () => {
    requestUser = RequestUser.of('admin@useEnvoye.co');

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    trackerService = new TrackerService(
      prismaService,
      new GeofenceService(prismaService),
    );
    const permissionService = new PermissionService(
      prismaService,
      new RoleService(),
    );
    adminController = new TrackerAdminController(
      trackerService,
      permissionService,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('listDevices', () => {
    it('returns registered devices for SuperAdmin without api keys', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const firstImei = faker.string.numeric(15);
      const secondImei = faker.string.numeric(15);
      await adminController.registerDevice(requestUser, { imei: firstImei });
      await adminController.registerDevice(requestUser, { imei: secondImei });

      const devices = await adminController.listDevices(requestUser);

      expect(devices.map((device) => device.imei)).toEqual([
        secondImei,
        firstImei,
      ]);
      expect(devices[0]).not.toHaveProperty('apiKey');
    });

    it('throws NotFoundException when user lacks manage_devices permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await expect(adminController.listDevices(requestUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('registerDevice', () => {
    it('returns the registered device and one-time api key for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const imei = faker.string.numeric(15);

      const body = await adminController.registerDevice(requestUser, { imei });

      expect(body.imei).toBe(imei);
      expect(body.id).toBeDefined();
      expect(body.apiKey).toMatch(/^trk_/);

      const persistedDevice = await prismaService.device.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(persistedDevice).toMatchObject({
        imei,
        isActive: true,
      });
      expect(Object.keys(persistedDevice)).not.toContain('apiKey');
      expect(
        await prismaService.deviceApiKey.findFirstOrThrow({
          where: { deviceId: body.id, isActive: true },
        }),
      ).toMatchObject({
        keyHash: hashDeviceApiKey(body.apiKey),
      });
    });

    it('throws ConflictException when imei is already registered', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const imei = faker.string.numeric(15);
      await adminController.registerDevice(requestUser, { imei });

      await expect(
        adminController.registerDevice(requestUser, { imei }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when user lacks manage_devices permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await expect(
        adminController.registerDevice(requestUser, {
          imei: faker.string.numeric(15),
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rotateDeviceApiKey', () => {
    it('returns a new one-time api key and revokes the previous key', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const registered = await adminController.registerDevice(requestUser, {
        imei: faker.string.numeric(15),
      });

      const rotated = await adminController.rotateDeviceApiKey(requestUser, {
        deviceId: registered.id,
      });

      expect(rotated.id).toBe(registered.id);
      expect(rotated.apiKey).toMatch(/^trk_/);
      expect(rotated.apiKey).not.toBe(registered.apiKey);

      const revokedCredential =
        await prismaService.deviceApiKey.findFirstOrThrow({
          where: { keyHash: hashDeviceApiKey(registered.apiKey) },
        });
      expect(revokedCredential.isActive).toBe(false);
      expect(revokedCredential.revokedAt).not.toBeNull();
    });

    it('throws NotFoundException when device does not exist', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await expect(
        adminController.rotateDeviceApiKey(requestUser, {
          deviceId: 'missing-device-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user lacks manage_devices permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await expect(
        adminController.rotateDeviceApiKey(requestUser, {
          deviceId: 'any-device-id',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
