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
import { Feature } from '@/generated/prisma/client';
import { MAIN_FEATURE } from '../consts';

describe('FeatureService', () => {
  let service: FeaturesService;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;
  let app: INestApplication;

  async function userIsOnWaitlist(email: string, prismaService: PrismaService) {
    const mainFeature = await prismaService.feature.findFirst({
      where: { name: MAIN_FEATURE },
    });
    if (!mainFeature) {
      return false;
    }

    return (
      (await prismaService.featureSubscription.count({
        where: { email: email, featureId: mainFeature.id },
      })) > 0
    );
  }

  async function expectFeatureToHaveVoteCount(
    featureId: string,
    voteCount: number,
  ) {
    expect(
      await prismaService.featureVotes.count({
        where: { featureId: featureId },
      }),
    ).toBe(voteCount);
    expect(
      await prismaService.feature.findUnique({
        where: { id: featureId },
      }),
    ).toHaveProperty('voteCount', voteCount);
  }

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

    afterAll(async () => {
      await prismaService.feature.deleteMany();
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

  describe('Toggle vote', () => {
    let someCoolFeature: Feature;
    const userEmail = 'derick@useenvoye.com';

    describe('when user is on wait list', () => {
      beforeEach(async () => {
        const mainFeature = featureFactory.build(
          {},
          { transient: { main: true } },
        );
        someCoolFeature = featureFactory.build({
          name: 'Some cool feature',
          voteCount: 0,
        });
        await prismaService.feature.create({ data: mainFeature });
        await prismaService.feature.create({ data: someCoolFeature });
        await waitlistService.join(userEmail);
      });

      afterEach(async () => {
        await prismaService.feature.deleteMany();
      });

      it('should add vote to feature', async () => {
        await expectFeatureToHaveVoteCount(someCoolFeature.id, 0);
        await service.toggleVote(userEmail, someCoolFeature.id);
        await expectFeatureToHaveVoteCount(someCoolFeature.id, 1);
      });

      it('should remove vote from feature when user has already voted', async () => {
        const anotherUser = 'tunde@yahoo.com';
        await waitlistService.join(anotherUser);

        await service.toggleVote(userEmail, someCoolFeature.id);
        await service.toggleVote(anotherUser, someCoolFeature.id);

        await expectFeatureToHaveVoteCount(someCoolFeature.id, 2);

        await service.toggleVote(anotherUser, someCoolFeature.id);
        await expectFeatureToHaveVoteCount(someCoolFeature.id, 1);
      });
    });

    describe('when user is not on waitlist', () => {
      let upcomingFeature: Feature;

      beforeEach(async () => {
        const mainFeature = featureFactory.build(
          {},
          { transient: { main: true } },
        );
        upcomingFeature = featureFactory.build({
          name: 'Upcoming feature',
          voteCount: 0,
        });
        await prismaService.feature.create({ data: mainFeature });
        await prismaService.feature.create({ data: upcomingFeature });
      });

      afterEach(async () => {
        await prismaService.feature.deleteMany();
      });

      it('should add user to waitlist', async () => {
        const anonymousUser = 'deleke@gmail.com';
        expect(await userIsOnWaitlist(anonymousUser, prismaService)).toBe(
          false,
        );
        await service.toggleVote(anonymousUser, upcomingFeature.id);
        expect(await userIsOnWaitlist(anonymousUser, prismaService)).toBe(true);
      });

      it('should add vote to feature', async () => {
        const someUser = 'someuser@gmail.com';
        await expectFeatureToHaveVoteCount(upcomingFeature.id, 0);
        await service.toggleVote(someUser, upcomingFeature.id);
        await expectFeatureToHaveVoteCount(upcomingFeature.id, 1);
      });

      it('should remove vote from feature when user has already voted', async () => {
        const someUser = 'saliu@gmail.com';
        await service.toggleVote('kenneth@gmail.com', upcomingFeature.id);
        await service.toggleVote('kemi@yahoo.co.uk', upcomingFeature.id);
        await service.toggleVote('joshua@gmail.com', upcomingFeature.id);
        await service.toggleVote('john@gmail.com', upcomingFeature.id);

        await expectFeatureToHaveVoteCount(upcomingFeature.id, 4);

        await service.toggleVote(someUser, upcomingFeature.id);
        await expectFeatureToHaveVoteCount(upcomingFeature.id, 5);

        await service.toggleVote(someUser, upcomingFeature.id);
        await expectFeatureToHaveVoteCount(upcomingFeature.id, 4);
      });
    });
  });
});
