import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { SetupAdministrativeWorkspaceCommand } from '@/commands/setup-administrative-workspace.command';
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from '@/auth/test-utils/supabase.mock';
import {
  ENVOYE_WORKSPACE_CODE,
  FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
} from '@/feature-flag/const';
import FeatureFlagManager from '@/feature-flag/manager';
import { ROLES } from '@/permission/types';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';
import Factory from '@/factories/factory';
import {
  FeatureFlagStatus,
  PreVerificationStatus,
} from '@/generated/prisma/enums';
import { faker } from '@faker-js/faker';
import { LinkService } from '@/common/link-service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { RoleService } from '@/permission/role/role.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { AuthService } from '@/auth/auth.service';
import PasswordGenerator from '@/auth/services/password.generator';
import { TeammatesService } from '@/teammates/teammates.service';
import { TestEmailClient } from '@/messaging/email/test-email-client';

describe('SetupAdministrativeWorkspaceCommand', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let command: SetupAdministrativeWorkspaceCommand;
  let featureFlagManager: FeatureFlagManager;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);

    featureFlagManager = new FeatureFlagManager(prismaService);
    const teammateService = new TeammatesService(prismaService);
    const authService = new AuthService(
      mockSupabaseClient as unknown as SupabaseClient,
      new PasswordGenerator(),
      prismaService,
      jest.fn() as unknown as LinkService,
      teammateService,
    );

    const workspaceManager = new WorkspaceManager(
      prismaService,
      new TestEmailClient(),
      jest.fn() as unknown as LinkService,
      new RoleService(),
      new WorkspaceInviteService(prismaService, authService),
    );

    command = new SetupAdministrativeWorkspaceCommand(
      prismaService,
      authService,
      workspaceManager,
      featureFlagManager,
    );
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.workspaceFeature.deleteMany();
    await prismaService.featureFlag.deleteMany();
    await app.close();
  });

  async function assertWorkspaceCreated() {
    const workspace = await prismaService.workspace.findUniqueOrThrow({
      where: { code: ENVOYE_WORKSPACE_CODE },
    });
    expect(workspace.code).toBe(ENVOYE_WORKSPACE_CODE);
  }

  async function assertTeammateIsAddedAsSuperAdmin(userEmail: string) {
    const teammate = await prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: {
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          email: userEmail,
        },
      },
    });
    expect(teammate.groups).toStrictEqual([ROLES.SuperAdmin.code]);
  }

  async function assertFeatureIsOptedInto() {
    await expect(
      featureFlagManager.enabled(
        ENVOYE_WORKSPACE_CODE,
        FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
      ),
    ).resolves.toBe(true);

    const flag = await prismaService.featureFlag.findUniqueOrThrow({
      where: { key: FEATURE_ADMINISTRATIVE_WORKSPACE_KEY },
    });
    expect(flag.status).toBe(FeatureFlagStatus.PARTIAL);
  }

  it('creates verified preverification and super-admin teammate', async () => {
    const userEmail = faker.internet.email().toLowerCase();

    await command.run([], { email: userEmail });

    const preverification =
      await prismaService.preVerification.findFirstOrThrow({
        where: { email: userEmail },
      });
    expect(preverification.status).toBe(PreVerificationStatus.VERIFIED);

    await assertTeammateIsAddedAsSuperAdmin(userEmail);
    await assertFeatureIsOptedInto();
  });

  it('when teammate exists in another workspace, still creates super-admin teammate in administrative workspace', async () => {
    const factory = Factory.createStrategy(prismaService);

    const sowetoWorkspace = await factory.persist('workspace', () =>
      workspaceFactory.build({ id: 6, code: 'other0' }),
    );

    const teammate = await factory.persist('teammate', () =>
      teammateFactory.build({
        id: 6,
        workspaceCode: 'other0',
        groups: [ROLES.WorkspaceAdmin.code],
      }),
    );

    expect(
      await prismaService.teammate.count({
        where: { email: teammate.email, workspaceCode: sowetoWorkspace.code },
      }),
    ).toBe(1);

    await command.run([], { email: teammate.email });

    await assertWorkspaceCreated();
    await assertTeammateIsAddedAsSuperAdmin(teammate.email.toLowerCase());
    await assertFeatureIsOptedInto();
  });
});
