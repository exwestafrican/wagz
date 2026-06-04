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
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { EMAIL_CLIENT, EmailClient } from '@/messaging/email/email-client';
import { TeammatesService } from '@/teammates/teammates.service';

describe('BackfillController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let sendMock: jest.MockedFunction<EmailClient['send']>;

  beforeEach(async () => {
    requestUser = RequestUser.of('sam@useEnvoye.co');
    sendMock = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await TestControllerModuleWithAuthUser({
      controllers: [BackfillController],
      providers: [
        BackfillRegistryProvider,
        PermissionService,
        RoleService,
        PrismaService,
        TeammatesService,
        { provide: EMAIL_CLIENT, useValue: { send: sendMock } },
      ],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.workspace.deleteMany();
    await prismaService.preVerification.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  describe('list', () => {
    it('should return a list of backfill jobs for super admin', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );
      const response = await request(getHttpServer(app))
        .get(URIPaths.LIST_TASKS)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.OK);
      const body = response.body as BackfillResponseDto[];
      expect(body.length).toBe(1);
    });

    it('should return 403 for when user is not super admin', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .get(URIPaths.LIST_TASKS)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('run', () => {
    const runPath = (jobId: string) =>
      URIPaths.RUN_TASK.replace(':jobId', jobId);

    it('should run a backfill job for super admin and return a success summary', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          username: 'sam.smith',
          normalizedUsername: 'sam.smith',
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

      const response = await request(getHttpServer(app))
        .post(runPath('normalize_usernames'))
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        jobId: 'normalize_usernames',
        status: 'success',
        result: { processed: 1, success: 1, failed: 0 },
      });

      const teammate = await prismaService.teammate.findFirstOrThrow({
        where: { workspaceCode: workspace.code, email: requestUser.email },
      });
      expect(teammate.normalizedUsername).toBe('samsmith');

      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should still return 200 when the completion email fails to send', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );
      sendMock.mockRejectedValueOnce(new Error('smtp unavailable'));

      await request(getHttpServer(app))
        .post(runPath('normalize_usernames'))
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.OK);

      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for an unknown job', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .post(runPath('does_not_exist'))
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
