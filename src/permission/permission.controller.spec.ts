import { PermissionController } from './permission.controller';
import RequestUser from '@/auth/domain/request-user';
import { PermissionService } from './permission.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TestControllerModuleWithAuthUser,
  createTestApp,
} from '@/test-helpers/test-app';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import getHttpServer from '@/test-helpers/get-http-server';
import { PermissionEndpoints } from '@/common/const';
import request from 'supertest';
import { RoleService } from './role/role.service';
import teammateFactory from '@/factories/teammate.factory';

describe('PermissionController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@usewaggz.com');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [PermissionController],
      providers: [PermissionService, RoleService],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  it('should return a users permissions', async () => {
    const detail = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        email: requestUser.email,
        groups: ['WorkspaceAdmin'],
      }),
    );
    const response = await request(getHttpServer(app))
      .get(PermissionEndpoints.TEAMMATE_PERMISSIONS)
      .query({ workspaceCode: detail.teammate.workspaceCode })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.OK);

    expect(response.body).toEqual(
      expect.arrayContaining([
        'read_support_conversations',
        'reply_support_conversations',
        'manage_teammates',
        'message_teammates',
        'manage_channels',
      ]),
    );
  });
});
