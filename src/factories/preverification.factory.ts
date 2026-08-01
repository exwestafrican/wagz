import {
  PreVerification,
  PreVerificationStatus,
} from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { PrismaService } from '@/prisma/prisma.service';
import buildUsername from '@/common/build-username';

const preVerificationFactory = Factory.define<PreVerification>(() => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = buildUsername(firstName, lastName);

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
});

export async function persistPreVerification(
  prismaService: PrismaService,
  preVerification: PreVerification,
) {
  await prismaService.preVerification.create({ data: preVerification });
}

export default preVerificationFactory;
