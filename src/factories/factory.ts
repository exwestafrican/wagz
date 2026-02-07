import { Workspace } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import companyProfileFactory from '@/factories/company-profile.factory';

export interface PersistStrategy {
  persist: <T>(strategy: string, buildObject: () => T) => Promise<T>;
}

function createPersistStrategy(prismaService: PrismaService): PersistStrategy {
  return {
    persist: async function <T>(strategy: string, buildObject: () => T) {
      const obj = buildObject();
      switch (strategy) {
        case 'workspace': {
          const workspace = obj as Workspace;
          const companyProfile = companyProfileFactory.build({
            companyName: workspace.name,
            id: workspace.ownedById,
            domain: `${workspace.name.toLowerCase()}.co`,
          });
          await prismaService.companyProfile.create({ data: companyProfile });
          await prismaService.workspace.create({ data: workspace });
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
  createStrategy: (prismaService: PrismaService) => createPersistStrategy(prismaService),
};

export default Factory;
