import featuresSubscriptionFactory from '@/factories/roadmap/features-subscription.factory';
import featureFactory from '@/factories/roadmap/features.factory';
import { Feature } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export async function setupMainFeature(prismaService: PrismaService) {
  const mainFeature = featureFactory.build({}, { transient: { main: true } });
  await prismaService.feature.create({ data: mainFeature });
  return mainFeature;
}

export async function addFeature(prismaService: PrismaService, title: string) {
  const feature = featureFactory.build({
    name: title,
    voteCount: 0,
  });
  await prismaService.feature.create({
    data: feature,
  });
  return feature;
}

export async function subscribeToFeature(
  prismaService: PrismaService,
  email: string,
  feature: Feature,
) {
  const subscription = featuresSubscriptionFactory.build({
    email: email,
    featureId: feature.id,
  });
  await prismaService.featureSubscription.create({ data: subscription });
  return subscription;
}
