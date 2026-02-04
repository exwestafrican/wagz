import { CompanyProfile } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

const companyProfileFactory = Factory.define<CompanyProfile>(({ sequence }) => {
  return {
    id: sequence,
    companyName: faker.company.name(),
    domain: faker.internet.domainName(),
    pointOfContactEmail: faker.internet.email(),
    phoneCountryCode: '+234',
    phoneNumber: '8169098834',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export default companyProfileFactory;
