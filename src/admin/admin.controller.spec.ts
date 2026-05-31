import { TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import RequestUser from '@/auth/domain/request-user';
import getHttpServer from '@/test-helpers/get-http-server';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import {
  setupSuperAdmin,
  setupWorkspaceWithTeammate,
} from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import FeatureFlagManager from '@/feature-flag/manager';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import featureFlagFactory from '@/factories/feature-flag.factory';
import workspaceFactory from '@/factories/workspace.factory';
import { FeatureFlagStatus } from '@/generated/prisma/enums';

describe('AdminController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('admin@useEnvoye.co');
    const module: TestingModule = await TestControllerModuleWithAuthUser({
      controllers: [AdminController],
      providers: [FeatureFlagManager, PermissionService, RoleService],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.workspaceFeature.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.featureFlag.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await prismaService.preVerification.deleteMany();
    await app.close();
  });

  describe('Create', () => {
    const validBody = {
      key: 'new_feature_flag',
      name: 'New feature',
      description: 'Does something useful',
    };

    it('creates a feature flag for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      const response = await request(getHttpServer(app))
        .post('/admin/feature-flag')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        key: validBody.key,
        name: validBody.name,
        description: validBody.description,
        status: 'DISABLED',
      });

      const featureFlag = await prismaService.featureFlag.findFirstOrThrow({
        where: { key: validBody.key },
      });
      expect(featureFlag.addedBy).toBe(requestUser.email);
    });

    it('returns 403 when user lacks create permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 400 for invalid key format', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await request(getHttpServer(app))
        .post('/admin/feature-flag')
        .set('Authorization', 'Bearer test-token')
        .send({
          ...validBody,
          key: 'Invalid_Key',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 409 when key already exists', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ key: validBody.key }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag')
        .set('Authorization', 'Bearer test-token')
        .send(validBody)
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('Update status', () => {
    it('updates feature flag status for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.DISABLED }),
      );

      const response = await request(getHttpServer(app))
        .patch(`/admin/feature-flag/${featureFlag.key}/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: FeatureFlagStatus.GLOBAL })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        key: featureFlag.key,
        status: FeatureFlagStatus.GLOBAL,
      });
    });

    it('returns 403 when user lacks update permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build(),
      );

      await request(getHttpServer(app))
        .patch(`/admin/feature-flag/${featureFlag.key}/status`)
        .set('Authorization', 'Bearer test-token')
        .send({ status: FeatureFlagStatus.GLOBAL })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 404 for unknown key', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await request(getHttpServer(app))
        .patch('/admin/feature-flag/nonexistent_flag/status')
        .set('Authorization', 'Bearer test-token')
        .send({ status: FeatureFlagStatus.GLOBAL })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Delete', () => {
    it('deletes a feature flag for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build(),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/delete')
        .set('Authorization', 'Bearer test-token')
        .send({ key: featureFlag.key })
        .expect(HttpStatus.NO_CONTENT);

      await expect(
        prismaService.featureFlag.findFirst({
          where: { key: featureFlag.key },
        }),
      ).resolves.toBeNull();
    });

    it('returns 403 when user lacks delete permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build(),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/delete')
        .set('Authorization', 'Bearer test-token')
        .send({ key: featureFlag.key })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 404 for unknown key', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await request(getHttpServer(app))
        .post('/admin/feature-flag/delete')
        .set('Authorization', 'Bearer test-token')
        .send({ key: 'nonexistent_flag' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Enable apps', () => {
    it('enables feature for apps for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.PARTIAL }),
      );
      const koboMart = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Kobo Mart' }),
      );
      const zuriBakery = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Zuri Bakery' }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/enable-apps')
        .set('Authorization', 'Bearer test-token')
        .send({
          key: featureFlag.key,
          appCodes: [koboMart.code, zuriBakery.code],
        })
        .expect(HttpStatus.OK);

      const persistedFlag = await prismaService.featureFlag.findFirstOrThrow({
        where: { key: featureFlag.key },
      });
      const enabledWorkspaceFeatures =
        await prismaService.workspaceFeature.findMany({
          where: { featureFlagId: persistedFlag.id },
        });
      expect(enabledWorkspaceFeatures).toHaveLength(2);
      expect(
        enabledWorkspaceFeatures
          .map((workspaceFeature) => workspaceFeature.workspaceCode)
          .sort(),
      ).toEqual([koboMart.code, zuriBakery.code].sort());
    });

    it('returns 403 when user lacks permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.PARTIAL }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/enable-apps')
        .set('Authorization', 'Bearer test-token')
        .send({ key: featureFlag.key, appCodes: ['ab34c67'] })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 404 for unknown feature key', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const koboMart = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Kobo Mart' }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/enable-apps')
        .set('Authorization', 'Bearer test-token')
        .send({ key: 'nonexistent_flag', appCodes: [koboMart.code] })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 200 when app codes are not found', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.PARTIAL }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/enable-apps')
        .set('Authorization', 'Bearer test-token')
        .send({ key: featureFlag.key, appCodes: ['000000'] })
        .expect(HttpStatus.OK);
    });
  });

  describe('Get apps with feature enabled', () => {
    it('returns apps for SuperAdmin', async () => {
      await setupSuperAdmin(factory, requestUser.email);
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.PARTIAL }),
      );
      const koboMart = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Kobo Mart' }),
      );
      const zuriBakery = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Zuri Bakery' }),
      );

      await request(getHttpServer(app))
        .post('/admin/feature-flag/enable-apps')
        .set('Authorization', 'Bearer test-token')
        .send({
          key: featureFlag.key,
          appCodes: [koboMart.code, zuriBakery.code],
        })
        .expect(HttpStatus.OK);

      const response = await request(getHttpServer(app))
        .get('/admin/feature-flag/apps')
        .query({ featureFlag: featureFlag.key })
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          {
            appId: koboMart.id,
            appCode: koboMart.code,
            name: 'Kobo Mart',
          },
          {
            appId: zuriBakery.id,
            appCode: zuriBakery.code,
            name: 'Zuri Bakery',
          },
        ]),
      );
    });

    it('returns 403 when user lacks permission', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      const featureFlag = await factory.persist('featureFlag', () =>
        featureFlagFactory.build({ status: FeatureFlagStatus.PARTIAL }),
      );

      await request(getHttpServer(app))
        .get('/admin/feature-flag/apps')
        .query({ featureFlag: featureFlag.key })
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 404 for unknown feature key', async () => {
      await setupSuperAdmin(factory, requestUser.email);

      await request(getHttpServer(app))
        .get('/admin/feature-flag/apps')
        .query({ featureFlag: 'nonexistent_flag' })
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
