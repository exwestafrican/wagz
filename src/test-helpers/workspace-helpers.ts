import Factory, { PersistStrategy } from '@/factories/factory';
import teammateFactory from '@/factories/teammate.factory';
import workspaceFactory from '@/factories/workspace.factory';
import { FeatureFlagStatus, Teammate } from '@/generated/prisma/client';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import FeatureFlagManager from '@/feature-flag/manager';
import featureFlagFactory from '@/factories/feature-flag.factory';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { ROLES } from '@/permission/types';

export async function setupSuperAdmin(
  factory: PersistStrategy,
  email: string,
  workspaceCode: string = ENVOYE_WORKSPACE_CODE,
) {
  return setupWorkspaceWithTeammate(
    factory,
    teammateFactory.build({
      email,
      workspaceCode,
      groups: [ROLES.SuperAdmin.code],
    }),
  );
}

export async function setupWorkspaceWithTeammateRole(
  factory: PersistStrategy,
  teammateRole: string[],
) {
  const workspace = await factory.persist('workspace', () =>
    workspaceFactory.envoyeWorkspace(),
  );
  const teammate = await factory.persist('teammate', () =>
    teammateFactory.build({
      groups: teammateRole,
      workspaceCode: workspace.code,
    }),
  );
  return teammate;
}

export async function setupWorkspaceWithTeammate(
  factory: PersistStrategy,
  teammate: Teammate,
) {
  const workspace = await factory.persist('workspace', () =>
    workspaceFactory.build({
      code: teammate.workspaceCode,
    }),
  );
  const createdTeammate = await factory.persist('teammate', () => teammate);
  return { workspace: workspace, teammate: createdTeammate };
}

export async function setupWorkspaceWithFeatures(
  app: INestApplication,
  workspaceCode: string,
  featureKeys: string[],
) {
  const prismaService = app.get<PrismaService>(PrismaService);
  const featureFlagManager: FeatureFlagManager =
    app.get<FeatureFlagManager>(FeatureFlagManager);
  const factory = Factory.createStrategy(prismaService);

  await factory.persist('workspace', () =>
    workspaceFactory.build({ code: workspaceCode }),
  );

  for (const key of featureKeys) {
    await factory.persist('featureFlag', () =>
      featureFlagFactory.build({
        key,
        status: FeatureFlagStatus.PARTIAL,
      }),
    );
    await featureFlagManager.enableFF(workspaceCode, key);
  }
}
