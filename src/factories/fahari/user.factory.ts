import { Factory } from 'fishery';
import { User } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { PrismaService } from '@/prisma/prisma.service';

class UserFactory extends Factory<User> {
  superAdmin() {
    return this.build({ isSuperAdmin: true });
  }
}

const userFactory = UserFactory.define(({ sequence }) => {
  return {
    id: sequence,
    email: faker.internet.email().toLowerCase(),
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    isSuperAdmin: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export async function persistUser(prismaService: PrismaService, user: User) {
  await prismaService.user.create({ data: user });
}

export default userFactory;
