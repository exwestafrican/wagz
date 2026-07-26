import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { TrackerService } from '@/tracker/tracker.service';
import { TrackerController } from '@/tracker/tracker.controller';
import { TrackerAdminController } from '@/tracker/admin/tracker-admin.controller';
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

  describe('recordLocation', () => {
    it('returns the created location for a registered device', async () => {
      const device = await trackerService.registerDevice(
        faker.string.numeric(15),
      );

      const body = await controller.recordLocation({
        deviceId: device.id,
        latitude: 6.5244,
        longitude: 3.3792,
      });

      expect(body.deviceId).toBe(device.id);
      expect(body.latitude).toBeCloseTo(6.5244);
      expect(body.longitude).toBeCloseTo(3.3792);
      expect(body.id).toBeDefined();
    });

    it('throws NotFoundException when device does not exist', async () => {
      await expect(
        controller.recordLocation({
          deviceId: 'missing-device-id',
          latitude: 6.5244,
          longitude: 3.3792,
        }),
      ).rejects.toThrow(NotFoundException);
    });
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
    it('returns registered devices for SuperAdmin', async () => {
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

      await expect(adminController.listDevices(requestUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('registerDevice', () => {
    it('returns the registered device for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const imei = faker.string.numeric(15);

      const body = await adminController.registerDevice(requestUser, { imei });

      expect(body.imei).toBe(imei);
      expect(body.id).toBeDefined();
      expect(
        await prismaService.device.findUnique({ where: { id: body.id } }),
      ).toMatchObject({ imei });
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
