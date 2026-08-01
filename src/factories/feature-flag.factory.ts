import { FeatureFlag } from '@/generated/prisma/client';
import { FeatureFlagStatus } from '@/generated/prisma/enums';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';
import { PrismaService } from '@/prisma/prisma.service';

const featureFlagFactory = Factory.define<FeatureFlag>(({ sequence }) => {
  const suffix = sequence.toString(36);
  return {
    id: sequence,
    key: `test_flag_${suffix}`,
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    status: FeatureFlagStatus.DISABLED,
    addedBy: faker.internet.email(),
    enabledAt: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
});

export async function persistFeatureFlag(
  prismaService: PrismaService,
  flag: FeatureFlag,
) {
  await prismaService.featureFlag.create({
    data: {
      key: flag.key,
      name: flag.name,
      description: flag.description,
      status: flag.status,
      addedBy: flag.addedBy,
      enabledAt: flag.enabledAt ?? undefined,
    },
  });
}

export default featureFlagFactory;
