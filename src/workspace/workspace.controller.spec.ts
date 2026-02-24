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
import Factory, { PersistStrategy } from '@/factories/factory';
import request from 'supertest';

import { AuthEndpoints } from '@/common/const';
import getHttpServer from '@/test-helpers/get-http-server';
import { faker } from '@faker-js/faker';

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
      providers: [WorkspaceManager],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await app.close();
  });

  function buildEmails(size: number) {
    return new Array(size).fill(0).map(() => faker.internet.email());
  }

  describe('Setup', () => {
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

  describe(' Invite Teammates', () => {
    it('does not accept empty email list', async () => {
      await request(getHttpServer(app))
        .post(AuthEndpoints.INVITE_TEAMMATES)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: [] })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('does not accept more than 10 emails', async () => {
      await request(getHttpServer(app))
        .post(AuthEndpoints.INVITE_TEAMMATES)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: buildEmails(11) })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('accepts up to 10 emails', async () => {
      await request(getHttpServer(app))
        .post(AuthEndpoints.INVITE_TEAMMATES)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: buildEmails(9) })
        .expect(HttpStatus.OK);
    });
  });
});
