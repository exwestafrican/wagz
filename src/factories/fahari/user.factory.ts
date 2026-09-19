import { Factory } from 'fishery';
import { User } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { PrismaService } from '@/prisma/prisma.service';
import { cleanName } from '@/fahari/user/clean-name';
import { ProvisionReservedAccountDto } from '@/fahari/payments/dto/provision-reserved-account.dto';

class UserFactory extends Factory<User> {
  superAdmin() {
    return this.build({ isSuperAdmin: true });
  }
}

const userFactory = UserFactory.define(({ sequence }) => {
  return {
    id: sequence,
    email: faker.internet.email().toLowerCase(),
    firstname: cleanName(faker.person.firstName()),
    lastname: cleanName(faker.person.lastName()),
    isSuperAdmin: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export async function persistUser(prismaService: PrismaService, user: User) {
  await prismaService.user.create({
    data: {
      ...user,
      email: user.email.trim().toLowerCase(),
      firstname: cleanName(user.firstname),
      lastname: cleanName(user.lastname),
    },
  });
  await prismaService.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"user"', 'id'), (SELECT MAX(id) FROM "user"))`,
  );
}

export function toProvisionReservedAccountDto(
  user: Pick<User, 'firstname' | 'lastname' | 'email'>,
): ProvisionReservedAccountDto {
  return {
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
    bvn: '21212121212',
    nin: '12034875601',
  };
}

export default userFactory;
