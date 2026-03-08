import { PersistStrategy } from '@/factories/factory';
import teammateFactory from '@/factories/teammate.factory';
import workspaceFactory from '@/factories/workspace.factory';
import { Teammate } from '@/generated/prisma/client';

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
