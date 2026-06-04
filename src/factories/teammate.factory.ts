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
  // The factory inserts an explicit `id`, which does NOT advance Postgres'
  // autoincrement sequence. Callers that create teammates without an id (e.g.
  // the invite-acceptance service) would then reuse a sequence value that
  // collides with an explicitly-inserted id. Keep the sequence ahead of any
  // explicit id we just inserted.
  await prismaService.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('teammate', 'id'),
      (SELECT MAX(id) FROM teammate)
    )`;
}

export default teammateFactory;
