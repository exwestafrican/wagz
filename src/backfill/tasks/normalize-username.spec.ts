import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { LinkService } from '@/common/link-service';
import { RoleService } from '@/permission/role/role.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { AuthService } from '@/auth/auth.service';
import { mockAuthService } from '@/test-helpers/mocks';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { Teammate } from '@/generated/prisma/client';
import { BackfillModule } from '@/backfill/backfill.module';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';

describe('Normalize Username Backfill Task', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let service: NormalizeUsernames;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    service = new NormalizeUsernames(prismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await prismaService.workspace.deleteMany();
  });

  test('we backfill usernames correctly', async () => {
    const { workspace } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        username: 'tumise',
        normalizedUsername: 'tumise',
        email: 'test@example.com',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );

    const teammates = ['laura.ajoku', 'omon1'].map((username) =>
      teammateFactory.build({
        workspaceCode: workspace.code,
        username: username,
        normalizedUsername: username,
      }),
    );

    await prismaService.teammate.createMany({
      data: teammates,
    });

    const dbTeammates: Teammate[] = await prismaService.teammate.findMany();

    expect(
      dbTeammates.map((t: Teammate) => t.normalizedUsername),
    ).toMatchObject(['tumise', 'laura.ajoku', 'omon1']);

    await service.run(workspace);

    const backfilledTeammates = await prismaService.teammate.findMany();

    expect(
      backfilledTeammates.map((t: Teammate) => t.normalizedUsername),
    ).toMatchObject(['tumise', 'lauraajoku', 'omon1']);
  });
});
