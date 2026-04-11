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
  InviteStatus,
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
import { faker } from '@faker-js/faker';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { RoleService } from '@/permission/role/role.service';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';
import { PermissionService } from '@/permission/permission.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import workspaceInviteFactory from '@/factories/workspace-invite.factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import { AuthService } from '@/auth/auth.service';
import { mockAuthService } from '@/test-helpers/mocks';
import { LinkService } from '@/link-service';

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
        LinkService,
        RoleService,
        PermissionService,
        WorkspaceInviteService,
        {
          provide: AuthService,
          useValue: mockAuthService as unknown as AuthService,
        },
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

  async function sendWorkspaceInvite(
    recipientEmail: string,
    status: InviteStatus,
  ) {
    const { teammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        id: 7,
        email: 'admin@useenvoye.com',
        groups: ['WorkspaceAdmin'],
        workspaceCode: '9Jk076',
      }),
    );

    return await factory.persist('workspaceInvite', () =>
      workspaceInviteFactory.build({
        recipientEmail: recipientEmail,
        senderId: teammate.id,
        workspaceCode: '9Jk076',
        inviteCode: 'ap7ol0',
        status: status,
      }),
    );
  }

  describe('Decode Invite', () => {
    it('returns ok and decoded result when valid', async () => {
      await sendWorkspaceInvite('laura@useenvoye.co', InviteStatus.SENT);
      const response = await request(getHttpServer(app))
        .get(URIPaths.VERIFY_INVITE)
        .query({ inviteCode: 'bGF1cmFAdXNlZW52b3llLmNvLDlKazA3NixhcDdvbDA' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        recipientEmail: 'laura@useenvoye.co',
        workspaceCode: '9Jk076',
      });
    });

    it('returns forbidden for invalid invite code', async () => {
      await request(getHttpServer(app))
        .get(URIPaths.VERIFY_INVITE)
        .query({ inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw=' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns forbidden if valid code but belongs to no one', async () => {
      await request(getHttpServer(app))
        .get(URIPaths.VERIFY_INVITE)
        .query({ inviteCode: 'bGF1cmFAdXNlZW52b3llLmNvLDlKazA3NixhcDdvbDA' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns forbidden if valid code but invite is not pending', async () => {
      await sendWorkspaceInvite('laura@useenvoye.co', InviteStatus.ACCEPTED);
      await request(getHttpServer(app))
        .get(URIPaths.VERIFY_INVITE)
        .query({ inviteCode: 'bGF1cmFAdXNlZW52b3llLmNvLDlKazA3NixhcDdvbDA' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Accept Invite', () => {
    it('returns 201 and creates teammate for valid invite', async () => {
      await sendWorkspaceInvite('laura@useenvoye.co', InviteStatus.SENT);

      await request(getHttpServer(app))
        .post(URIPaths.ACCEPT_INVITE)
        .set('Accept', 'application/json')
        .send({
          workspaceCode: '9Jk076',
          inviteCode: 'ap7ol0',
          teammateEmail: 'laura@useenvoye.co',
          firstName: 'Laura',
          lastName: 'Smith',
          username: 'laura.smith',
        })
        .expect(HttpStatus.CREATED);

      const createdTeammate = await prismaService.teammate.findFirstOrThrow({
        where: { workspaceCode: '9Jk076', email: 'laura@useenvoye.co' },
        select: { groups: true, username: true },
      });
      expect(createdTeammate.groups).toEqual([ROLES.SupportStaff.code]);
      expect(createdTeammate.username).toBe('laura.smith');

      const invite = await prismaService.workspaceInvite.findFirstOrThrow({
        where: {
          workspaceCode: '9Jk076',
          inviteCode: 'ap7ol0',
          recipientEmail: 'laura@useenvoye.co',
        },
      });
      expect(invite.status).toBe(InviteStatus.ACCEPTED);
      expect(invite.acceptedAt).toBeTruthy();
      expect(mockAuthService.requestMagicLink).toHaveBeenCalledWith(
        'laura@useenvoye.co',
      );
    });

    it('returns forbidden for invalid invite code', async () => {
      await request(getHttpServer(app))
        .post(URIPaths.ACCEPT_INVITE)
        .set('Accept', 'application/json')
        .send({
          workspaceCode: '9Jk076',
          inviteCode: 'nope00',
          teammateEmail: 'laura@useenvoye.co',
          firstName: 'Laura',
          lastName: 'Smith',
          username: 'laura.smith',
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
