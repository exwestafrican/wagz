import { Factory } from 'fishery';
import { User } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { PrismaService } from '@/prisma/prisma.service';
import { cleanName } from '@/fahari/user/clean-name';

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
}

export default userFactory;
