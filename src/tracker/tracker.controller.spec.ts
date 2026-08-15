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
import { TrackerService } from '@/tracker/tracker.service';
import { TrackerController } from '@/tracker/tracker.controller';
import { TrackerAdminController } from '@/tracker/admin/tracker-admin.controller';
import { DeviceAuthGuard } from '@/tracker/guard/device-auth.guard';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import RequestUser from '@/auth/domain/request-user';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  setupSuperAdmin,
  setupWorkspaceWithTeammate,
} from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { ROLES } from '@/permission/types';
import { hashDeviceApiKey } from '@/tracker/device-api-key';

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
    trackerService = new TrackerService(prismaService);
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

  it('returns 401 when authorization header is missing', async () => {
    await request(getHttpServer(app))
      .post('/tracker/locations')
      .send({
        locations: [
          {
            latitude: 6.5244,
            longitude: 3.3792,
            speed: 1,
            capturedAt: '2026-08-15T20:01:02.000Z',
          },
        ],
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the api key is wrong', async () => {
    await trackerService.registerDevice(faker.string.numeric(15));

    await request(getHttpServer(app))
      .post('/tracker/locations')
      .set('Authorization', 'Bearer trk_not-a-real-key')
      .send({
        locations: [
          {
            latitude: 6.5244,
            longitude: 3.3792,
            speed: 1,
            capturedAt: '2026-08-15T20:01:02.000Z',
          },
        ],
      })
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
      .send({
        locations: [
          {
            latitude: 6.5244,
            longitude: 3.3792,
            speed: 1,
            capturedAt: '2026-08-15T20:01:02.000Z',
          },
        ],
      })
      .expect(HttpStatus.UNAUTHORIZED);

    expect(await prismaService.location.count()).toBe(0);
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
    trackerService = new TrackerService(prismaService);
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

      const persistedDevice = await prismaService.device.findUnique({
        where: { id: body.id },
      });
      expect(persistedDevice).toMatchObject({
        imei,
        isActive: true,
        apiKeyHash: hashDeviceApiKey(body.apiKey),
      });
      expect(Object.keys(persistedDevice!)).not.toContain('apiKey');
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
});
