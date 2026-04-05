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

import { AuthEndpoints, URIPaths } from '@/common/const';
import getHttpServer from '@/test-helpers/get-http-server';
import { MailerProvider } from '@/messaging/messaging.module';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { faker } from '@faker-js/faker';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { RoleService } from '@/permission/role/role.service';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';
import { PermissionService } from '@/permission/permission.service';

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
      providers: [
        WorkspaceManager,
        MailerProvider,
        WorkspaceLinkService,
        RoleService,
        PermissionService,
      ],
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

  function buildEmails(size: number) {
    return new Array(size).fill(0).map(() => faker.internet.email());
  }

  async function setupAuthenticatedTeammate(): Promise<Workspace> {
    const workspace = await factory.persist('workspace', () =>
      workspaceFactory.envoyeWorkspace(),
    );
    await factory.persist('teammate', () =>
      teammateFactory.build({
        email: requestUser.email,
        workspaceCode: workspace.code,
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );
    return workspace;
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

  describe(' Invite Teammates', () => {
    it('does not accept empty email list', async () => {
      await request(getHttpServer(app))
        .post(URIPaths.INVITE_TEAMMATES)
        .query({ workspaceCode: 'any-workspace' })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: [], role: ROLES.SupportStaff.code })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('does not accept more than 10 emails', async () => {
      const workspace = await setupAuthenticatedTeammate();
      const response = await request(getHttpServer(app))
        .post(URIPaths.INVITE_TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: buildEmails(11), role: ROLES.SupportStaff.code })
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ValidationErrorResponseDto;

      expect(body.property).toContain('emails');
    });

    it('accepts up to 10 emails', async () => {
      const workspace = await setupAuthenticatedTeammate();
      const emails = buildEmails(9);
      await request(getHttpServer(app))
        .post(URIPaths.INVITE_TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails, role: ROLES.SupportStaff.code })
        .expect(HttpStatus.OK);

      expect(
        await prismaService.workspaceInvite.count({
          where: {
            workspaceCode: workspace.code,
            recipientRole: ROLES.SupportStaff.code,
            recipientEmail: {
              in: emails,
            },
          },
        }),
      ).toBe(9);
    });

    it('returns bad request for invalid role', async () => {
      const workspace = await setupAuthenticatedTeammate();
      const response = await request(getHttpServer(app))
        .post(URIPaths.INVITE_TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({
          emails: buildEmails(1),
          role: 'NotARealRole',
        })
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ValidationErrorResponseDto;

      expect(body.property).toContain('role');
    });

    it('returns 403 when teammate does not have manage teammate permission', async () => {
      const workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );

      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: requestUser.email,
          workspaceCode: workspace.code,
          groups: [ROLES.SupportStaff.code],
        }),
      );

      await request(getHttpServer(app))
        .post(URIPaths.INVITE_TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send({ emails: buildEmails(1), role: ROLES.WorkspaceAdmin.code })
        .expect(HttpStatus.FORBIDDEN);

      expect(
        await prismaService.workspaceInvite.count({
          where: { workspaceCode: workspace.code },
        }),
      ).toBe(0);
    });
  });
});
