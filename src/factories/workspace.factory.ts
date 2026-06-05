import { Workspace, WorkspaceStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import companyProfileFactory from '@/factories/company-profile.factory';
import { sixCharHumanFriendlyCode } from '@/factories/code-generator';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ENVOYE_WORKSPACE_CODE,
  ENVOYE_WORKSPACE_ID,
} from '@/feature-flag/const';
import preVerificationFactory from './preverification.factory';
import { w } from 'node_modules/@faker-js/faker/dist/airline-CLphikKp.cjs';

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
    ownedById: sequence,
    code: sixCharHumanFriendlyCode(),
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
  const preverification = await prismaService.preVerification.create({ data: preVerificationFactory.build() })
  const companyProfile = companyProfileFactory.build({
    companyName: workspace.name,
    id: workspace.ownedById,
    preVerificationId: preverification.id,
    domain: `${workspace.name.toLowerCase()}.co`,
  });
  await prismaService.companyProfile.create({ data: companyProfile });
  await prismaService.workspace.create({ data: workspace });
}

export default workspaceFactory;
