import { WorkspaceController } from './workspace.controller';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import RequestUser from '@/auth/domain/request-user';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  PreVerification,
  PreVerificationStatus,
  Workspace,
} from '@/generated/prisma/client';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import request from 'supertest';

import { AuthEndpoints } from '@/common/const';
import getHttpServer from '@/test-helpers/get-http-server';
import { MailerProvider } from '@/messaging/messaging.module';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';

describe('WorkspaceController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let preVerificationDetails: PreVerification;

  beforeEach(async () => {
    requestUser = RequestUser.of('sam@useEnvoye.co');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [WorkspaceController],
      providers: [WorkspaceManager, MailerProvider],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  describe('Auth user owns resource', () => {
    it('returns 201 for  successful preverification', async () => {
      preVerificationDetails = await factory.persist('preverification', () =>
        preVerificationFactory.build({
          email: requestUser.email,
          status: PreVerificationStatus.PENDING,
        }),
      );

      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: preVerificationDetails.id })
        .expect(HttpStatus.CREATED);
    });

    it('it throws conflict when verification is verified', async () => {
      preVerificationDetails = await factory.persist('preverification', () =>
        preVerificationFactory.build({
          email: requestUser.email,
          status: PreVerificationStatus.VERIFIED,
        }),
      );
      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: preVerificationDetails.id })
        .expect(HttpStatus.CONFLICT);
    });

    it('it returns not found when auth user is not owner of verification', async () => {
      const anotherUsersPreverification = await factory.persist(
        'preverification',
        () =>
          preVerificationFactory.build({
            email: 'someOtherUser@useenvoye.co',
            status: PreVerificationStatus.PENDING,
          }),
      );
      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: anotherUsersPreverification.id })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('getTeammates', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
    });

    it('should return 404 when caller is not in the workspace', async () => {
      await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/teammates`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 200 and teammates when caller is a member', async () => {
      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: workspace.code,
        }),
      );

      const response = await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/teammates`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getTeammate', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
    });

    it('should return 404 when caller is not in the workspace', async () => {
      await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/teammates/1`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when teammate id belongs to a different workspace', async () => {
      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: workspace.code,
        }),
      );

      const otherWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.build({ code: 'wr78uh' }),
      );
      const otherTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'other@usewaggz.com',
          workspaceCode: otherWorkspace.code,
        }),
      );

      await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/teammates/${otherTeammate.id}`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 200 with the teammate when caller is a member and id is valid', async () => {
      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: workspace.code,
        }),
      );
      const targetTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'target@usewaggz.com',
          workspaceCode: workspace.code,
        }),
      );

      const response = await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/teammates/${targetTeammate.id}`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      expect(response.body.teammateId).toBe(targetTeammate.id);
      expect(response.body.email).toBe(targetTeammate.email);
    });
  });

  describe('getPermissions', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
    });

    it('should return 404 when caller is not in the workspace', async () => {
      await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/permissions`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('returns 200 with the permissions of the calling user', async () => {
      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: workspace.code,
          groups: ['WorkspaceAdmin'],
        }),
      );

      const response = await request(getHttpServer(app))
        .get(`/workspace/${workspace.code}/permissions`)
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      const codes = response.body.map((p: { code: string }) => p.code);
      expect(codes).toContain('manage_teammates');
      expect(codes).toContain('read_support_conversations');
    });
  });
});
