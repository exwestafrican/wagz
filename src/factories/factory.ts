import {
  PreVerification,
  Teammate,
  Workspace,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { persistPreverificationStrategy } from '@/factories/roadmap/preverification.factory';
import { persistWorkspaceStrategy } from '@/factories/workspace.factory';
import { persistTeammate } from '@/factories/teammate.factory';

export interface PersistStrategy {
  persist: <T>(strategy: string, buildObject: () => T) => Promise<T>;
}

function createPersistStrategy(prismaService: PrismaService): PersistStrategy {
  return {
    persist: async function <T>(strategy: string, buildObject: () => T) {
      const obj = buildObject();
      switch (strategy) {
        case 'preverification': {
          await persistPreverificationStrategy(
            prismaService,
            obj as PreVerification,
          );
          return obj;
        }
        case 'workspace': {
          await persistWorkspaceStrategy(prismaService, obj as Workspace);
          return obj;
        }
        case 'teammate': {
          await persistTeammate(prismaService, obj as Teammate);
          return obj;
        }
        default: {
          throw new Error(`Unknown strategy ${strategy}`);
        }
      }
    },
  };
}

const Factory = {
  createStrategy: (prismaService: PrismaService) =>
    createPersistStrategy(prismaService),
};

export default Factory;
