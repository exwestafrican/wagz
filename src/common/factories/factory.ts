import {
  CompanyProfile,
  FeatureFlag,
  PreVerification,
  Teammate,
  Workspace,
  WorkspaceInvite,
} from '@/generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { persistPreverificationStrategy } from '@/common/factories/roadmap/preverification.factory';
import { persistWorkspaceStrategy } from '@/common/factories/workspace.factory';
import { persistTeammate } from '@/common/factories/teammate.factory';
import { persistWorkspaceInvite } from '@/common/factories/workspace-invite.factory';
import { persistFeatureFlag } from '@/common/factories/feature-flag.factory';
import { persistCompanyProfile } from '@/common/factories/company-profile.factory';

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
        case 'workspaceInvite': {
          await persistWorkspaceInvite(prismaService, obj as WorkspaceInvite);
          return obj;
        }
        case 'featureFlag': {
          await persistFeatureFlag(prismaService, obj as FeatureFlag);
          return obj;
        }
        case 'companyProfile': {
          await persistCompanyProfile(prismaService, obj as CompanyProfile);
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
