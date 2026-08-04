import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { BackfillPreverificationUsername } from '@/backfill/tasks/preverification-username';
import { resetDb } from '@/test-helpers/rest-db';
import { Workspace } from '@/generated/prisma/client';

describe('Backfill Preverification Username Task', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let service: BackfillPreverificationUsername;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    service = new BackfillPreverificationUsername(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function linkedPreVerification(workspace: Workspace) {
    const companyProfile = await prismaService.companyProfile.findUniqueOrThrow(
      {
        where: { id: workspace.ownedById },
        include: { preVerification: true },
      },
    );
    return companyProfile.preVerification;
  }

  test('copies teammate username onto preverification when missing', async () => {
    const { workspace, teammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        username: 'tumise',
        normalizedUsername: 'tumise',
        email: 'tumise@example.com',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );

    const preVerification = await linkedPreVerification(workspace);
    await prismaService.preVerification.update({
      where: { id: preVerification.id },
      data: { username: teammate.username, email: teammate.email },
    });

    await service.run(workspace);

    const updatedPreVerification =
      await prismaService.preVerification.findUniqueOrThrow({
        where: { id: preVerification.id },
      });
    expect(updatedPreVerification.username).toBe('tumise');
  });

  test('skips when teammate has no username', async () => {
    const { workspace, teammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        username: 'tumise',
        normalizedUsername: 'tumise',
        email: 'tumise@example.com',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );

    const preVerification = await linkedPreVerification(workspace);
    await prismaService.preVerification.update({
      where: { id: preVerification.id },
      data: { username: teammate.username, email: teammate.email },
    });

    await service.run(workspace);

    const unchangedPreVerification =
      await prismaService.preVerification.findUniqueOrThrow({
        where: { id: preVerification.id },
      });
    expect(unchangedPreVerification.username).toBeNull();
  });

  test('skips when no teammate matches preverification email', async () => {
    const { workspace } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        username: 'tumise',
        normalizedUsername: 'tumise',
        email: 'tumise@example.com',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );

    const preVerification = await linkedPreVerification(workspace);
    await prismaService.preVerification.update({
      where: { id: preVerification.id },
      data: {
        username: 'unmatched',
        email: 'unmatched@example.com',
      },
    });

    await service.run(workspace);

    const unchangedPreVerification =
      await prismaService.preVerification.findUniqueOrThrow({
        where: { id: preVerification.id },
      });
    expect(unchangedPreVerification.username).toBeNull();
  });
});
