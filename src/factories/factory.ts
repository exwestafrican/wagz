import {
  Booking,
  ClientPickupDetail,
  CompanyProfile,
  FeatureFlag,
  PreVerification,
  Teammate,
  User,
  Workspace,
  WorkspaceInvite,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { persistPreverificationStrategy } from '@/factories/roadmap/preverification.factory';
import { persistWorkspaceStrategy } from '@/factories/workspace.factory';
import { persistTeammate } from '@/factories/teammate.factory';
import { persistWorkspaceInvite } from '@/factories/workspace-invite.factory';
import { persistFeatureFlag } from '@/factories/feature-flag.factory';
import { persistCompanyProfile } from '@/factories/company-profile.factory';
import { persistUser } from '@/factories/fahari/user.factory';
import { persistBooking } from '@/factories/fahari/booking.factory';
import { persistClientPickupDetail } from '@/factories/fahari/client-pickup-detail.factory';

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
        case 'user': {
          await persistUser(prismaService, obj as User);
          return obj;
        }
        case 'booking': {
          await persistBooking(prismaService, obj as Booking);
          return obj;
        }
        case 'clientPickupDetail': {
          await persistClientPickupDetail(
            prismaService,
            obj as ClientPickupDetail,
          );
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
