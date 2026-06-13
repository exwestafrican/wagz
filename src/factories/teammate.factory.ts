import { Factory } from 'fishery';
import { Teammate, TeammateStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import { sixCharHumanFriendlyCode } from '@/factories/code-generator';

class TeammateFactory extends Factory<Teammate> {
  adminTeammate() {
    return this.build({ groups: [ROLES.WorkspaceAdmin.code] });
  }
}
const teammateFactory = TeammateFactory.define(({ sequence }) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = `${firstName}.${lastName}`;
  return {
    id: sequence,
    email: faker.internet.email(),
    firstName: firstName,
    lastName: lastName,
    username: username,
    normalizedUsername: username.split('.').join(''),
    workspaceCode: sixCharHumanFriendlyCode(),
    status: TeammateStatus.ACTIVE,
    avatarUrl: faker.internet.url(),
    groups: [ROLES.WorkspaceAdmin.code],
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export async function persistTeammate(
  prismaService: PrismaService,
  teammate: Teammate,
) {
  await prismaService.teammate.create({ data: teammate });
}

export default teammateFactory;
