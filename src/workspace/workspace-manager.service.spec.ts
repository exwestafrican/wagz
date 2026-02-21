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
  Workspace,
} from '@/generated/prisma/client';
import { ROLES } from '@/permission/types';
import NotFoundInDb from '@/common/exceptions/not-found';
import { InvalidState } from '@/common/exceptions/invalid-state';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';

describe('WorkspaceService', () => {
  let service: WorkspaceManager;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let preVerificationDetails: PreVerification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
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
    describe('Teammate is new and has no Invites', () => {
      it('creates invite', async () => {
        const workspace = await factory.persist('workspace', () =>
          workspaceFactory.envoyeWorkspace(),
        );

        const admin = await factory.persist('teammate', () =>
          teammateFactory.build({
            groups: [ROLES.WorkspaceAdmin.code],
            workspaceId: workspace.id,
          }),
        );

        const recipientEmail = 'tumise@usewaggz.com';

        await assertRecipientHasNoInvite(workspace, recipientEmail);

        await service.inviteTeammateIfEligible(
          workspace.code,
          recipientEmail,
          admin.id,
          ROLES.SupportStaff,
        );

        expect(
          await prismaService.workspaceInvite.count({
            where: {
              workspace: workspace,
              senderId: admin.id,
              status: InviteStatus.SENT,
              recipientEmail: recipientEmail,
            },
          }),
        ).toBe(1);
      });
    });
  });
});
