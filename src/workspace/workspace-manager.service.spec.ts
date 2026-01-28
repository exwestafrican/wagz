import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceManager } from './workspace-manager.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import { PreVerification } from '@/generated/prisma/client';
import { ROLES } from '@/permission/types';

describe('WorkspaceService', () => {
  let service: WorkspaceManager;
  let app: INestApplication;
  let prismaService: PrismaService;
  let preVerificationDetails: PreVerification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [WorkspaceManager],
    }).compile();
    app = await createTestApp(module);
    service = app.get<WorkspaceManager>(WorkspaceManager);
    prismaService = app.get<PrismaService>(PrismaService);
    preVerificationDetails = preVerificationFactory.build();
    await prismaService.preVerification.create({
      data: preVerificationDetails,
    });
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await app.close();
  });

  async function assertRequiredStepsRun(details: PreVerification) {
    const companyProfile = await prismaService.companyProfile.findFirst({
      where: { pointOfContactEmail: preVerificationDetails.email },
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
  }

  describe('setup', () => {
    describe('Teammate', () => {
      it('it runs teammate create step successfully', async () => {
        expect(
          await prismaService.teammate.count({
            where: { email: preVerificationDetails.email },
          }),
        ).toBe(0);

        await service.setup(preVerificationDetails.email);
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
          service.setup(preVerificationDetails.email),
        ).rejects.toThrow('Database error');

        await assertRollbackHappened(preVerificationDetails);
      });
    });
  });
});
