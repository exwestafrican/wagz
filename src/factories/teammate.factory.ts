import { Factory } from 'fishery';
import { Teammate, TeammateStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import { sixCharHumanFriendlyCode } from '@/factories/code-generator';
import normalizeUsername from '@/common/normalize-username';

class TeammateFactory extends Factory<Teammate> {
  adminTeammate() {
    return this.build({ groups: [ROLES.WorkspaceAdmin.code] });
  }
}
const teammateFactory = TeammateFactory.define(({ sequence, params }) => {
  const firstName = params.firstName ?? faker.person.firstName();
  const lastName = params.lastName ?? faker.person.lastName();
  const username = params.username ?? `${firstName}.${lastName}`;
  return {
    id: sequence,
    email: faker.internet.email(),
    firstName: firstName,
    lastName: lastName,
    username: username,
    normalizedUsername:
      params.normalizedUsername ?? normalizeUsername(username),
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
