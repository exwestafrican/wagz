import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceManager } from './workspace-manager.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  InviteStatus,
  PreVerification,
  PreVerificationStatus,
  Teammate,
  TeammateStatus,
  Workspace,
  WorkspaceInvite,
} from '@/generated/prisma/client';
import { ROLES } from '@/permission/types';
import NotFoundInDb from '@/common/exceptions/not-found';
import { InvalidState } from '@/common/exceptions/invalid-state';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';
import workspaceInviteFactory from '@/factories/workspace-invite.factory';
import { MessagingModule } from '@/messaging/messaging.module';

describe('WorkspaceService', () => {
  let service: WorkspaceManager;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let preVerificationDetails: PreVerification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, MessagingModule],
      providers: [WorkspaceManager],
    }).compile();
    app = await createTestApp(module);
    service = app.get<WorkspaceManager>(WorkspaceManager);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    preVerificationDetails = await factory.persist('preverification', () =>
      preVerificationFactory.build(),
    );
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await prismaService.workspace.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function assertRequiredStepsRun(details: PreVerification) {
    const companyProfile = await prismaService.companyProfile.findFirst({
      where: { pointOfContactEmail: details.email },
    });
    expect(companyProfile).toBeTruthy();

    const workspace = await prismaService.workspace.findFirst({
      where: { ownedById: companyProfile!.id },
    });
    expect(workspace).toBeTruthy();

    expect(
      await prismaService.teammate.count({
        where: { email: details.email },
      }),
    ).toBe(1);

    expect(
      await prismaService.companyProfile.count({
        where: { pointOfContactEmail: details.email },
      }),
    ).toBe(1);

    const preverification =
      await prismaService.preVerification.findUniqueOrThrow({
        where: { id: details.id },
      });
    expect(preverification.status).toBe(PreVerificationStatus.VERIFIED);
  }

  async function assertRollbackHappened(details: PreVerification) {
    expect(
      await prismaService.companyProfile.count({
        where: { pointOfContactEmail: details.email },
      }),
    ).toBe(0);

    expect(
      await prismaService.workspace.count({
        where: { name: details.companyName },
      }),
    ).toBe(0);

    expect(
      await prismaService.teammate.count({
        where: { email: details.email },
      }),
    ).toBe(0);

    const preverification =
      await prismaService.preVerification.findUniqueOrThrow({
        where: { id: details.id },
      });
    expect(preverification.status).toBe(PreVerificationStatus.PENDING);
  }

  async function assertRecipientHasNoInvite(
    workspace: Workspace,
    email: string,
  ) {
    expect(
      await prismaService.workspaceInvite.count({
        where: {
          workspace: workspace,
          recipientEmail: email,
        },
      }),
    ).toBe(0);
  }

  async function assertRecipientHasPreviouslyFailedInvite(
    workspace: Workspace,
    email: string,
  ) {
    expect(
      await prismaService.workspaceInvite.count({
        where: {
          workspace: workspace,
          recipientEmail: email,
          status: InviteStatus.FAILED,
        },
      }),
    ).toBe(0);
  }

  async function assertRecipientWasPreviouslySuccessfullyInvited(
    workspace: Workspace,
    email: string,
  ) {
    expect(
      await prismaService.workspaceInvite.count({
        where: {
          workspace: workspace,
          recipientEmail: email,
          status: InviteStatus.ACCEPTED,
        },
      }),
    ).toBe(1);
  }

  function assertInviteIsCreated(
    invite: WorkspaceInvite,
    recipientEmail: string,
  ) {
    expect(invite).not.toBeNull();
    expect(invite.recipientRole).toBe(ROLES.SupportStaff.code);
    expect(invite.recipientEmail).toBe(recipientEmail);
    expect(invite.validTill).toStrictEqual(
      new Date('2026-02-23T23:59:59.999Z'),
    );
  }

  async function assertFailedInviteIsCreated(
    workspace: Workspace,
    adminTeammate: Teammate,
    recipientEmail: string,
  ) {
    expect(
      await prismaService.workspaceInvite.count({
        where: {
          workspace: workspace,
          senderId: adminTeammate.id,
          status: InviteStatus.FAILED,
          recipientEmail: recipientEmail,
        },
      }),
    ).toBe(1);
  }

  describe('setup', () => {
    it('returns not found when email and id do not match', async () => {
      await expect(
        service.setup('somrandomEmail', preVerificationDetails.id),
      ).rejects.toThrow(NotFoundInDb);
    });

    it('returns conflict when status is not pending', async () => {
      const details = await factory.persist('preverification', () =>
        preVerificationFactory.build({
          status: PreVerificationStatus.VERIFIED,
        }),
      );
      await expect(service.setup(details.email, details.id)).rejects.toThrow(
        InvalidState,
      );
    });

    describe('Teammate', () => {
      it('it runs teammate create step successfully', async () => {
        expect(
          await prismaService.teammate.count({
            where: { email: preVerificationDetails.email },
          }),
        ).toBe(0);
        expect(preVerificationDetails.status).toBe(
          PreVerificationStatus.PENDING,
        );
        await service.setup(
          preVerificationDetails.email,
          preVerificationDetails.id,
        );
        const teammate = await prismaService.teammate.findFirstOrThrow({
          where: { email: preVerificationDetails.email },
        });
        expect(teammate.groups.length).toBe(1);
        expect(teammate.groups[0]).toBe(ROLES.WorkspaceAdmin.code);
        await assertRequiredStepsRun(preVerificationDetails);
      });

      it('does not run teammate create step successfully', async () => {
        jest
          .spyOn(prismaService.teammate, 'create')
          .mockRejectedValue(new Error('Database error'));

        await expect(
          service.setup(
            preVerificationDetails.email,
            preVerificationDetails.id,
          ),
        ).rejects.toThrow('Database error');

        await assertRollbackHappened(preVerificationDetails);
      });
    });
  });

  describe('inviteTeammateIfEligible', () => {
    let adminTeammate: Teammate;
    let workspace: Workspace;
    let recipientEmail: string;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );

      adminTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          groups: [ROLES.WorkspaceAdmin.code],
          workspaceCode: workspace.code,
        }),
      );

      recipientEmail = 'tumise@usewaggz.com';

      const fixedMs = new Date('2026-02-21T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedMs);
    });

    describe('Teammate is new and has no Invites', () => {
      it('creates invite', async () => {
        await assertRecipientHasNoInvite(workspace, recipientEmail);

        await service.inviteTeammateIfEligible(
          workspace.code,
          recipientEmail,
          adminTeammate.id,
          ROLES.SupportStaff,
        );

        expect(
          await prismaService.workspaceInvite.count({
            where: {
              workspace: workspace,
              senderId: adminTeammate.id,
              status: InviteStatus.SENT,
              recipientEmail: recipientEmail,
            },
          }),
        ).toBe(1);
      });

      it('creates invite valid for 2 days', async () => {
        await assertRecipientHasNoInvite(workspace, recipientEmail);

        await service.inviteTeammateIfEligible(
          workspace.code,
          recipientEmail,
          adminTeammate.id,
          ROLES.SupportStaff,
        );

        const invite = await prismaService.workspaceInvite.findFirst({
          where: {
            workspace: workspace,
            senderId: adminTeammate.id,
            status: InviteStatus.SENT,
            recipientEmail: recipientEmail,
          },
        });

        expect(invite).not.toBeNull();
        expect(invite!.validTill).toStrictEqual(
          new Date('2026-02-23T23:59:59.999Z'),
        );
      });

      it('creates invite with invite role', async () => {
        await assertRecipientHasNoInvite(workspace, recipientEmail);

        await service.inviteTeammateIfEligible(
          workspace.code,
          recipientEmail,
          adminTeammate.id,
          ROLES.SupportStaff,
        );

        const invite = await prismaService.workspaceInvite.findFirst({
          where: {
            workspace: workspace,
            senderId: adminTeammate.id,
            status: InviteStatus.SENT,
            recipientEmail: recipientEmail,
          },
        });

        expect(invite).not.toBeNull();
        expect(invite!.recipientRole).toBe(ROLES.SupportStaff.code);
      });
    });

    describe('Teammate has previous failed Invite', () => {
      it('creates new invite for teammate', async () => {
        await assertRecipientHasPreviouslyFailedInvite(
          workspace,
          recipientEmail,
        );
        await service.inviteTeammateIfEligible(
          workspace.code,
          recipientEmail,
          adminTeammate.id,
          ROLES.SupportStaff,
        );

        const invite = await prismaService.workspaceInvite.findFirst({
          where: {
            workspace: workspace,
            senderId: adminTeammate.id,
            status: InviteStatus.SENT,
            recipientEmail: recipientEmail,
          },
        });

        assertInviteIsCreated(invite!, recipientEmail);
      });
    });

    describe('Teammate was previously successfully invited to workspace', () => {
      test.each([
        TeammateStatus.DISABLED,
        TeammateStatus.ACTIVE,
        TeammateStatus.DELETED,
      ])(
        'creates failed invite and does send email for %s Teammate',
        async (status: TeammateStatus) => {
          const senderTeammate = await factory.persist('teammate', () =>
            teammateFactory.build({
              email: 'sender@usewaggz.com',
              workspaceCode: workspace.code,
              status: status,
            }),
          );

          await factory.persist('workspaceInvite', () =>
            workspaceInviteFactory.build({
              recipientEmail: recipientEmail,
              senderId: senderTeammate.id,
              workspaceCode: workspace.code,
              status: InviteStatus.ACCEPTED,
            }),
          );

          await factory.persist('teammate', () =>
            teammateFactory.build({
              email: recipientEmail,
              workspaceCode: workspace.code,
              status: status,
            }),
          );

          await assertRecipientWasPreviouslySuccessfullyInvited(
            workspace,
            recipientEmail,
          );

          await service.inviteTeammateIfEligible(
            workspace.code,
            recipientEmail,
            adminTeammate.id,
            ROLES.SupportStaff,
          );

          await assertFailedInviteIsCreated(
            workspace,
            adminTeammate,
            recipientEmail,
          );
        },
      );
    });
  });

  describe('getTeammates', () => {
    let workspace: Workspace;
    let callerTeammate: Teammate;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
      callerTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'laura@usewaggz.com',
          workspaceCode: workspace.code,
        }),
      );
    });

    it('should throw NotFoundInDb if caller is not in the workspace', async () => {
      await expect(
        service.getTeammates(workspace.code, 'notTeammate@usewaggz.com'),
      ).rejects.toThrow(NotFoundInDb);
    });

    it('should return teammates in the workspace', async () => {
      const result = await service.getTeammates(
        workspace.code,
        callerTeammate.email,
      );
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(
        result.some((teammate) => teammate.email === callerTeammate.email),
      );
    });

    it('does not return teammates in a different workspace', async () => {
      const otherWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.build({ code: 'wr78uh' }),
      );
      await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'otherTeammate@otherCompany.com',
          workspaceCode: otherWorkspace.code,
        }),
      );
      const result = await service.getTeammates(
        workspace.code,
        callerTeammate.email,
      );
      expect(
        result.every((teammate) => teammate.workspaceCode === workspace.code),
      ).toBe(true);
    });
  });

  describe('getTeammate', () => {
    let workspace: Workspace;
    let callerTeammate: Teammate;
    let targetTeammate: Teammate;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
      callerTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'laura@usewaggz.com',
          workspaceCode: workspace.code,
        }),
      );
      targetTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'amarachi@usewaggz.com',
          workspaceCode: workspace.code,
        }),
      );
    });

    it('should throw NotFoundInDb if caller is not in the workspace', async () => {
      await expect(
        service.getTeammate(
          workspace.code,
          'notTeammate@usewaggz.com',
          targetTeammate.id,
        ),
      ).rejects.toThrow(NotFoundInDb);
    });

    it('should throw NotFoundInDb if teammate id belongs to another workspace', async () => {
      const otherWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.build({ code: 'wr78uh' }),
      );
      const otherTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'otherTeammate@otherCompany.com',
          workspaceCode: otherWorkspace.code,
        }),
      );

      await expect(
        service.getTeammate(
          workspace.code,
          callerTeammate.email,
          otherTeammate.id,
        ),
      ).rejects.toThrow(NotFoundInDb);
    });

    it('should return teammate when caller is a member of workspace and id is valid', async () => {
      const result = await service.getTeammate(
        workspace.code,
        callerTeammate.email,
        targetTeammate.id,
      );
      expect(result.id).toBe(targetTeammate.id);
      expect(result.email).toBe(targetTeammate.email);
    });
  });

  describe('getPermissions', () => {
    let workspace: Workspace;

    beforeEach(async () => {
      workspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
    });

    it('should throw NotFoundInDb if caller is not in the workspace', async () => {
      await expect(
        service.getPermissions(workspace.code, 'notTeammate@usewaggz.com'),
      ).rejects.toThrow(NotFoundInDb);
    });

    it('should return the admin permissions for WorkspaceAdmin', async () => {
      const admin = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'admin@usewaggz.com',
          workspaceCode: workspace.code,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      const result = await service.getPermissions(workspace.code, admin.email);
      const codes = result.map((permission) => permission.code);
      expect(codes).toContain('read_support_conversations');
      expect(codes).toContain('reply_support_conversations');
      expect(codes).toContain('manage_teammates');
      expect(codes).toContain('message_teammates');
      expect(codes).toContain('manage_channels');
    });

    it('should return the support permissions for SupportStaff', async () => {
      const support = await factory.persist('teammate', () =>
        teammateFactory.build({
          email: 'support@usewaggz.com',
          workspaceCode: workspace.code,
          groups: [ROLES.SupportStaff.code],
        }),
      );

      const result = await service.getPermissions(
        workspace.code,
        support.email,
      );
      const codes = result.map((permission) => permission.code);
      expect(codes).toContain('read_support_conversations');
      expect(codes).toContain('reply_support_conversations');
      expect(codes).toContain('message_teammates');
      expect(codes).not.toContain('manage_teammates');
      expect(codes).not.toContain('manage_channels');
    });
  });
});
