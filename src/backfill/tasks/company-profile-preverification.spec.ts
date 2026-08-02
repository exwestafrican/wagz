import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import preVerificationFactory from '@/factories/preverification.factory';
import { ROLES } from '@/permission/types';
import { BackfillCompanyProfilePreverification } from '@/backfill/tasks/company-profile-preverification';
import { resetDb } from '@/test-helpers/rest-db';
import { Workspace } from '@/generated/prisma/client';

describe('Backfill Company Profile Preverification Task', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let service: BackfillCompanyProfilePreverification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    service = new BackfillCompanyProfilePreverification(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function companyProfileFor(workspace: Workspace) {
    return prismaService.companyProfile.findUniqueOrThrow({
      where: { id: workspace.ownedById },
    });
  }

  async function setupWorkspace() {
    return setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        username: 'tumise',
        normalizedUsername: 'tumise',
        email: 'tumise@example.com',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );
  }

  test('links company profile when email and company name match', async () => {
    const { workspace } = await setupWorkspace();
    const companyProfile = await companyProfileFor(workspace);

    const matchingPreVerification = await factory.persist(
      'preverification',
      () =>
        preVerificationFactory.build({
          email: 'poc@example.com',
          companyName: 'Kobo Mart',
        }),
    );

    await prismaService.companyProfile.update({
      where: { id: companyProfile.id },
      data: {
        pointOfContactEmail: 'poc@example.com',
        companyName: 'Kobo Mart',
        preVerificationId: matchingPreVerification.id,
      },
    });

    await service.run(workspace);

    const updatedCompanyProfile = await companyProfileFor(workspace);
    expect(updatedCompanyProfile.preVerificationId).toBe(
      matchingPreVerification.id,
    );
  });

  test('resets preVerificationId when already linked to a different record', async () => {
    const { workspace } = await setupWorkspace();
    const companyProfile = await companyProfileFor(workspace);
    const previousPreVerificationId = companyProfile.preVerificationId;

    const matchingPreVerification = await factory.persist(
      'preverification',
      () =>
        preVerificationFactory.build({
          email: 'poc@example.com',
          companyName: 'Kobo Mart',
        }),
    );

    await prismaService.companyProfile.update({
      where: { id: companyProfile.id },
      data: {
        pointOfContactEmail: 'poc@example.com',
        companyName: 'Kobo Mart',
      },
    });

    await service.run(workspace);

    const updatedCompanyProfile = await companyProfileFor(workspace);
    expect(updatedCompanyProfile.preVerificationId).toBe(
      matchingPreVerification.id,
    );
    expect(updatedCompanyProfile.preVerificationId).not.toBe(
      previousPreVerificationId,
    );
  });

  test('leaves preVerificationId unchanged when company name does not match', async () => {
    const { workspace } = await setupWorkspace();
    const companyProfile = await companyProfileFor(workspace);
    const originalPreVerificationId = companyProfile.preVerificationId;

    await factory.persist('preverification', () =>
      preVerificationFactory.build({
        email: 'poc@example.com',
        companyName: 'Kobo Mart',
      }),
    );

    await prismaService.companyProfile.update({
      where: { id: companyProfile.id },
      data: {
        pointOfContactEmail: 'poc@example.com',
        companyName: 'Zuri Bakery',
      },
    });

    await service.run(workspace);

    const unchangedCompanyProfile = await companyProfileFor(workspace);
    expect(unchangedCompanyProfile.preVerificationId).toBe(
      originalPreVerificationId,
    );
  });

  test('leaves preVerificationId unchanged when no preverification matches', async () => {
    const { workspace } = await setupWorkspace();
    const companyProfile = await companyProfileFor(workspace);
    const originalPreVerificationId = companyProfile.preVerificationId;

    await prismaService.companyProfile.update({
      where: { id: companyProfile.id },
      data: {
        pointOfContactEmail: 'unmatched@example.com',
        companyName: 'Unknown Co',
      },
    });

    await service.run(workspace);

    const unchangedCompanyProfile = await companyProfileFor(workspace);
    expect(unchangedCompanyProfile.preVerificationId).toBe(
      originalPreVerificationId,
    );
  });
});
