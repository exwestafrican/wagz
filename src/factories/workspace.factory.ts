import { Workspace, WorkspaceStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import companyProfileFactory from '@/factories/company-profile.factory';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ENVOYE_WORKSPACE_CODE,
  ENVOYE_WORKSPACE_ID,
} from '@/feature-flag/const';

class WorkspaceFactory extends Factory<Workspace> {
  envoyeWorkspace() {
    return this.build(
      {
        id: ENVOYE_WORKSPACE_ID,
        code: ENVOYE_WORKSPACE_CODE,
        name: 'Envoye',
      },
      {
        associations: {
          ownedById: companyProfileFactory.build({
            companyName: 'Envoye',
            domain: 'envoye.co',
          }).id,
        },
      },
    );
  }
}

const workspaceFactory = WorkspaceFactory.define(({ sequence }) => {
  return {
    id: sequence,
    name: faker.company.name(),
    status: WorkspaceStatus.ACTIVE,
    ownedById: 1,
    code: faker.string.alphanumeric({
      length: 6,
      exclude: ['i', 'l', '1', 'L', 'o', '0', 'O'],
    }),
    hasActivePlan: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    timezone: 'Africa/Lagos',
  };
});

export async function persistWorkspaceStrategy(
  prismaService: PrismaService,
  workspace: Workspace,
) {
  const companyProfile = companyProfileFactory.build({
    companyName: workspace.name,
    id: workspace.ownedById,
    domain: `${workspace.name.toLowerCase()}.co`,
  });
  await prismaService.companyProfile.create({ data: companyProfile });
  await prismaService.workspace.create({ data: workspace });
}

export default workspaceFactory;
