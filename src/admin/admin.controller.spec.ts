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
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import FeatureFlagManager from '@/feature-flag/manager';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import featureFlagFactory from '@/factories/feature-flag.factory';

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
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

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
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

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
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

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
});
