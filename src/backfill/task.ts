import { Workspace } from '@/generated/prisma/client';

export default interface BackfillTask {
  run(workspace: Workspace): Promise<void>;
}
