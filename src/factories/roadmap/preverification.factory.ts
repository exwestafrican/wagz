import { Factory } from 'fishery';
import {
  PreVerification,
  PreVerificationStatus,
} from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { PrismaService } from '@/prisma/prisma.service';
import buildUsername from '@/common/build-username';

const preVerificationFactory = Factory.define<PreVerification>(
  ({ params }) => {
    const firstName = params.firstName ?? faker.person.firstName();
    const lastName = params.lastName ?? faker.person.lastName();
    const username = params.username ?? buildUsername(firstName, lastName);
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: firstName,
      lastName: lastName,
      companyName: faker.company.name(),
      username: username,
      phoneCountryCode: '+234',
      phoneNumber: '8169098834',
      status: PreVerificationStatus.PENDING,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      timezone: 'Africa/Lagos',
    };
  },
);

export async function persistPreverificationStrategy(
  prismaService: PrismaService,
  preVerification: PreVerification,
) {
  await prismaService.preVerification.create({ data: preVerification });
}

export default preVerificationFactory;
