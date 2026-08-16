import { CompanyProfile } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { PrismaService } from '@/prisma/prisma.service';

const companyProfileFactory = Factory.define<CompanyProfile>(({ sequence }) => {
  return {
    id: sequence,
    companyName: faker.company.name(),
    domain: faker.internet.domainName(),
    pointOfContactEmail: faker.internet.email(),
    phoneCountryCode: '+234',
    phoneNumber: '8169098834',
    preVerificationId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export default companyProfileFactory;

export async function persistCompanyProfile(
  prismaService: PrismaService,
  companyProfile: CompanyProfile,
) {
  await prismaService.companyProfile.create({ data: companyProfile });
}
