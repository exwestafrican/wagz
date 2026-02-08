import { Factory } from 'fishery';
import {
  PreVerification,
  PreVerificationStatus,
} from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { PrismaService } from '@/prisma/prisma.service';

const preVerificationFactory = Factory.define<PreVerification>(() => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    companyName: faker.company.name(),
    phoneCountryCode: '+234',
    phoneNumber: '8169098834',
    status: PreVerificationStatus.PENDING,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    timezone: 'Africa/Lagos',
  };
});

export async function persistPreverificationStrategy(
  prismaService: PrismaService,
  preVerification: PreVerification,
) {
  await prismaService.preVerification.create({ data: preVerification });
}

export default preVerificationFactory;
