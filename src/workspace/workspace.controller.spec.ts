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
} from '@/generated/prisma/client';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import workspaceFactory from '@/factories/workspace.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import request from 'supertest';

import { AuthEndpoints } from '@/common/const';
import getHttpServer from '@/test-helpers/get-http-server';
import { MailerProvider } from '@/messaging/messaging.module';

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

  describe('getByCode', () => {
    it('returns workspace details for valid code', async () => {
      const workspace = await factory.persist('workspace', () =>
        workspaceFactory.build({ code: 'abc123', name: 'Test Workspace' }),
      );

      const response = await request(getHttpServer(app))
        .get(AuthEndpoints.WORKSPACE_DETAILS)
        .query({ code: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        code: workspace.code,
        status: workspace.status,
        name: workspace.name,
      });
    });

    it('returns 404 when workspace does not exist', async () => {
      await request(getHttpServer(app))
        .get(AuthEndpoints.WORKSPACE_DETAILS)
        .query({ code: 'nonex1' })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
