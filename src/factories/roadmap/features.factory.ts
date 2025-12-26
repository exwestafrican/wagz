import { Feature, FeatureStage } from '@/generated/prisma/client';
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { MAIN_FEATURE } from '@/roadmap/consts';

type FeatureTransientParams = {
  main: boolean;
};

const featureFactory = Factory.define<Feature, FeatureTransientParams>(
  ({ transientParams }) => {
    return {
      id: faker.string.uuid(),
      name: transientParams.main ? MAIN_FEATURE : faker.lorem.words(3),
      votes: faker.number.int({ min: 0, max: 100 }),
      icon: faker.string.alpha(15),
      stage: faker.helpers.arrayElement(Object.values(FeatureStage)),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  },
);

export default featureFactory;
