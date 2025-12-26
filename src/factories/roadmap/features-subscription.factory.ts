import { Factory } from 'fishery';
import { FeatureSubscription } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';

const featuresSubscriptionFactory = Factory.define<FeatureSubscription>(() => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email({ provider: 'useenvoye.com' }),
    featureId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export default featuresSubscriptionFactory;
