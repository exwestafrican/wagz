import { Workspace, WorkspaceStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

const workspaceFactory = Factory.define<Workspace>(({ sequence }) => {
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

export default workspaceFactory;
