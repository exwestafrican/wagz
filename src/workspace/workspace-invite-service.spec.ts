import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { RoleService } from '@/permission/role/role.service';
import { createTestApp } from '@/test-helpers/test-app';
import {
  DecodedResult,
  WorkspaceInviteService,
} from '@/workspace/workspace-invite-service';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';
import { INestApplication } from '@nestjs/common';
import { InviteStatus } from '@/generated/prisma/enums';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import workspaceInviteFactory from '@/factories/workspace-invite.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import { PrismaService } from '@/prisma/prisma.service';
import { resetDb } from '@/test-helpers/rest-db';
import { ROLES } from '@/permission/types';
import { AuthService } from '@/auth/auth.service';
import { Teammate, Workspace } from '@/generated/prisma/client';
import { mockAuthService } from '@/test-helpers/mocks';
import { LinkService } from '@/common/link-service';

describe('WorkspaceInviteService', () => {
  let app: INestApplication;
  let workspaceInviteService: WorkspaceInviteService;
  let factory: PersistStrategy;
  let prismaService: PrismaService;

  async function inviteTeammate(
    adminTeammate: Teammate,
    recipientEmail: string,
    workspace: Workspace,
  ) {
    await factory.persist('workspaceInvite', () =>
      workspaceInviteFactory.build({
        recipientEmail: recipientEmail,
        senderId: adminTeammate.id,
        workspaceCode: workspace.code,
        inviteCode: 'ap7ol0',
        status: InviteStatus.SENT,
        recipientRole: ROLES.SupportStaff.code,
        acceptedAt: null,
      }),
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, MessagingModule],
      providers: [
        WorkspaceManager,
        RoleService,
        WorkspaceInviteService,
        LinkService,
        {
          provide: AuthService,
          useValue: mockAuthService as unknown as AuthService,
        },
      ],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    workspaceInviteService = app.get<WorkspaceInviteService>(
      WorkspaceInviteService,
    );
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('encoding', () => {
    it('encodes and can decode back', () => {
      const inviteCode = workspaceInviteService.encodeInvite(
        'anabela.sidne@gmail.com',
        '9Jk076',
        'anal90',
      );
      expect(inviteCode).not.toContain('=');
      expect(workspaceInviteService.decodeInviteOrThrow(inviteCode)).toEqual({
        recipientEmail: 'anabela.sidne@gmail.com',
        workspaceCode: '9Jk076',
        codeInInvite: 'anal90',
      });
    });
  });

  describe('decode', () => {
    test.each([
      {
        inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw', // legacy (unpadded) base64
        decodedResult: {
          recipientEmail: 'sam@gmail.com',
          workspaceCode: '9Jk076',
          codeInInvite: 'anal90',
        },
      },
    ])(
      'it decodes correctly inviteCode: $inviteCode',
      ({
        inviteCode,
        decodedResult,
      }: {
        inviteCode: string;
        decodedResult: DecodedResult;
      }) => {
        expect(workspaceInviteService.decodeInviteOrThrow(inviteCode)).toEqual(
          decodedResult,
        );
      },
    );

    test('it throws exception when invite code is invalid', () => {
      expect(() => {
        workspaceInviteService.decodeInviteOrThrow(
          'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw=',
        );
      }).toThrow(InvalidInviteCode);
    });
  });

  describe('decodeAndVerifyOrThrow', () => {
    it('throws InvalidInviteCode when no DB match', async () => {
      const token = workspaceInviteService.encodeInvite(
        'a@b.com',
        'W123',
        'dbInviteCode',
      );
      await expect(
        workspaceInviteService.decodeAndVerifyOrThrow(token),
      ).rejects.toThrow(InvalidInviteCode);
    });

    test.each([
      InviteStatus.ACCEPTED,
      InviteStatus.PENDING,
      InviteStatus.FAILED,
    ])('it should fail for invalid status %s', async (status: InviteStatus) => {
      const { teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: 'admin@useenvoye.com',
          groups: ['WorkspaceAdmin'],
          workspaceCode: '9Jk076',
        }),
      );

      await factory.persist('workspaceInvite', () =>
        workspaceInviteFactory.build({
          recipientEmail: 'laura@useenvoye.co',
          senderId: teammate.id,
          workspaceCode: '9Jk076',
          inviteCode: 'ap7ol0',
          status: status,
        }),
      );

      const token = workspaceInviteService.encodeInvite(
        'laura@useenvoye.co',
        '9Jk076',
        'ap7ol0',
      );
      await expect(
        workspaceInviteService.decodeAndVerifyOrThrow(token),
      ).rejects.toThrow(InvalidInviteCode);
    });
  });

  describe('acceptInvite', () => {
    it('creates teammate and marks invite as accepted', async () => {
      const { teammate: adminTeammate, workspace } =
        await setupWorkspaceWithTeammate(
          factory,
          teammateFactory.build({
            id: 6,
            email: 'admin@useenvoye.com',
            groups: ['WorkspaceAdmin'],
            workspaceCode: '9Jk076',
          }),
        );

      await inviteTeammate(adminTeammate, 'laura@useenvoye.co', workspace);

      await workspaceInviteService.tryAcceptInvite('9Jk076', 'ap7ol0', {
        email: 'laura@useenvoye.co',
        firstName: 'Laura',
        lastName: 'Smith',
        username: 'laura.smith',
      });

      const createdTeammate = await prismaService.teammate.findFirstOrThrow({
        where: { workspaceCode: '9Jk076', email: 'laura@useenvoye.co' },
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
    });

    it('throws InvalidInviteCode when invite does not exist', async () => {
      await expect(
        workspaceInviteService.tryAcceptInvite('9Jk076', 'nope00', {
          email: 'laura@useenvoye.co',
          firstName: 'Laura',
          lastName: 'Smith',
          username: 'laura.smith',
        }),
      ).rejects.toThrow(InvalidInviteCode);
    });
  });

  describe('tryAcceptInviteAndRequestMagicLink', () => {
    it('creates teammate and marks invite as accepted and sends magic link', async () => {
      const { teammate: adminTeammate, workspace } =
        await setupWorkspaceWithTeammate(
          factory,
          teammateFactory.build({
            id: 6,
            email: 'admin@useenvoye.com',
            groups: ['WorkspaceAdmin'],
            workspaceCode: '9Jk076',
          }),
        );

      await inviteTeammate(adminTeammate, 'laura@useenvoye.co', workspace);

      await workspaceInviteService.tryAcceptInviteAndRequestMagicLink(
        '9Jk076',
        'ap7ol0',
        {
          email: 'laura@useenvoye.co',
          firstName: 'Laura',
          lastName: 'Smith',
          username: 'laura.smith',
        },
      );

      const createdTeammate = await prismaService.teammate.findFirstOrThrow({
        where: { workspaceCode: '9Jk076', email: 'laura@useenvoye.co' },
      });

      expect(createdTeammate).toBeTruthy();

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
  });
});
