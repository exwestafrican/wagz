import { TestingModule } from '@nestjs/testing';
import { BackfillController } from './backfill.controller';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import RequestUser from '@/auth/domain/request-user';
import { BackfillRegistryProvider } from '@/backfill/backfill-registry.provider';
import getHttpServer from '@/test-helpers/get-http-server';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { URIPaths } from '@/common/const';
import BackfillResponseDto from '@/backfill/dto/backfill-response.dto';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';

describe('BackfillController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('sam@useEnvoye.co');
    const module: TestingModule = await TestControllerModuleWithAuthUser({
      controllers: [BackfillController],
      providers: [
        BackfillRegistryProvider,
        PermissionService,
        RoleService,
        PrismaService,
      ],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  describe('list', () => {
    it('should return a list of backfill jobs for super admin', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          groups: [ROLES.SuperAdmin.code],
        }),
      );
      const response = await request(getHttpServer(app))
        .get(URIPaths.LIST_TASKS)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .query({ workspaceCode: workspace.code })
        .send()
        .expect(HttpStatus.OK);
      const body = response.body as BackfillResponseDto[];
      expect(body.length).toBe(1);
    });

    it('should return 403 for when user is not super admin', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .get(URIPaths.LIST_TASKS)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .query({ workspaceCode: workspace.code })
        .send()
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
