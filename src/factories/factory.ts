import { Workspace } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import companyProfileFactory from '@/factories/company-profile.factory';

export interface Strategy {
  persist: <T>(strategy: string, buildObject: () => T) => Promise<void>;
}

function CreationStrategy(prismaService: PrismaService): Strategy {
  return {
    persist: async function <T>(strategy: string, buildObject: () => T) {
      switch (strategy) {
        case 'workspace': {
          const workspace = buildObject() as Workspace;
          const companyProfile = companyProfileFactory.build({
            companyName: workspace.name,
            id: workspace.ownedById,
            domain: `${workspace.name.toLowerCase()}.co`,
          });
          await prismaService.companyProfile.create({ data: companyProfile });
          await prismaService.workspace.create({ data: workspace });
        }
      }
    },
  };
}

const Factory = {
  setupORM: (prismaService: PrismaService) => CreationStrategy(prismaService),
};

export default Factory;
