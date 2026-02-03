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
import request from 'supertest';

import { AuthEndpoints } from '@/common/const';
import getHttpServer from '@/test-helpers/get-http-server';

describe('WorkspaceController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let preVerificationDetails: PreVerification;

  beforeEach(async () => {
    requestUser = RequestUser.of('sam@useEnvoye.co');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [WorkspaceController],
      providers: [WorkspaceManager],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await app.close();
  });

  describe('Auth user owns resource', () => {
    it('returns 201 for  successful preverification', async () => {
      preVerificationDetails = preVerificationFactory.build({
        email: requestUser.email,
        status: PreVerificationStatus.PENDING,
      });
      await prismaService.preVerification.create({
        data: preVerificationDetails,
      });

      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: preVerificationDetails.id })
        .expect(HttpStatus.CREATED);
    });

    it('it throws conflict when verification is verified', async () => {
      preVerificationDetails = preVerificationFactory.build({
        email: requestUser.email,
        status: PreVerificationStatus.VERIFIED,
      });
      await prismaService.preVerification.create({
        data: preVerificationDetails,
      });
      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: preVerificationDetails.id })
        .expect(HttpStatus.CONFLICT);
    });

    it('it returns not found when auth user is not owner of verification', async () => {
      const anotherUsersPreverification = preVerificationFactory.build({
        email: 'someOtherUser@useenvoye.co',
        status: PreVerificationStatus.PENDING,
      });
      await prismaService.preVerification.create({
        data: anotherUsersPreverification,
      });
      await request(getHttpServer(app))
        .post(AuthEndpoints.SETUP_WORKSPACE)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ id: anotherUsersPreverification.id })
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
