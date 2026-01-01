import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { WaitlistModule } from '@/waitlist/waitlist.module';
import featureFactory from '@/factories/roadmap/features.factory';
import { FeatureRequestPriority } from '@/generated/prisma/enums';

describe('FeatureService', () => {
  let service: FeaturesService;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, WaitlistModule],
      providers: [FeaturesService, WaitlistService],
    }).compile();
    app = await createTestApp(module);
    service = app.get<FeaturesService>(FeaturesService);
    prismaService = app.get<PrismaService>(PrismaService);
    waitlistService = app.get<WaitlistService>(WaitlistService);
  });

  describe('Create feature request', () => {
    beforeAll(async () => {
      const mainFeature = featureFactory.build(
        {},
        { transient: { main: true } },
      );
      await prismaService.feature.create({ data: mainFeature });
    });

    it('should create a feature request when user is already in waitlist', async () => {
      const testEmail = 'test@test.com';

      // Ensure user is in waitlist
      await waitlistService.join(testEmail);

      // Verify no feature requests exist
      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: testEmail },
        }),
      ).toBe(0);

      await service.createFeatureRequest(
        testEmail,
        'test feature request',
        FeatureRequestPriority.LOW,
      );

      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: testEmail },
        }),
      ).toBe(1);
    });

    it('should auto-join user to waitlist and create feature request when user is not in waitlist', async () => {
      const testEmail = 'newuser@test.com';

      // Verify user is not in waitlist
      const subscriptionBefore =
        await prismaService.featureSubscription.findFirst({
          where: { email: testEmail },
        });
      expect(subscriptionBefore).toBeNull();

      // Verify no feature requests exist
      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: testEmail },
        }),
      ).toBe(0);

      // Create feature request (should auto-join to waitlist)
      await service.createFeatureRequest(
        testEmail,
        'new feature request',
        FeatureRequestPriority.MEDIUM,
      );

      // Verify user was added to waitlist
      const subscriptionAfter =
        await prismaService.featureSubscription.findFirst({
          where: { email: testEmail },
        });
      expect(subscriptionAfter).not.toBeNull();

      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: testEmail },
        }),
      ).toBe(1);
    });
  });
});
