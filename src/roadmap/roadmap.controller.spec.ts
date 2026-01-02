import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapController } from '@/roadmap/roadmap.controller';
import { RoadmapEndpoints } from '@/roadmap/consts';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import request from 'supertest';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { FeatureRequestPriority, FeatureStage } from '@/generated/prisma/enums';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import featureFactory from '@/factories/roadmap/features.factory';
import getHttpServer from '@/test-helpers/get-http-server';
import { WaitlistModule } from '@/waitlist/waitlist.module';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { PrismaModule } from '@/prisma/prisma.module';

describe('RoadmapController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, WaitlistModule],
      controllers: [RoadmapController],
      providers: [FeaturesService, WaitlistService],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    waitlistService = app.get<WaitlistService>(WaitlistService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Future Features', () => {
    beforeAll(async () => {
      const features = [
        FeatureStage.PLANNED,
        FeatureStage.IN_PROGRESS,
        FeatureStage.COMPLETED,
      ].map((stage) => featureFactory.build({ stage }));
      await prismaService.feature.createMany({
        data: features,
      });
    });

    it('should return a list of future features only (planned and completed)', async () => {
      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.FUTURE_FEATURES)
        .set('Accept', 'application/json')
        .expect(200);

      const body = response.body as FeatureDto[];
      expect(body).toHaveLength(2);
      const stages: FeatureStage[] = body.map(
        (feature) => feature.stage as FeatureStage,
      );
      expect(stages).toEqual(
        expect.arrayContaining([
          FeatureStage.PLANNED,
          FeatureStage.IN_PROGRESS,
        ]),
      );
      expect(stages).toHaveLength(2); // Ensure no extra items
    });
  });

  describe('Create feature request', () => {
    const testEmail = 'test@gmail.com';

    beforeAll(async () => {
      const mainFeature = featureFactory.build(
        {},
        { transient: { main: true } },
      );
      await prismaService.feature.create({ data: mainFeature });
      await waitlistService.join(testEmail);
    });

    it('should create a feature request when user is already in waitlist', async () => {
      await request(getHttpServer(app))
        .post(RoadmapEndpoints.FEATURE_REQUEST)
        .send({
          email: testEmail,
          description: 'test feature request',
          priority: FeatureRequestPriority.LOW,
        })
        .set('Accept', 'application/json')
        .expect(201);
    });

    it('should auto-join user to waitlist and create feature request when user is not in waitlist', async () => {
      const newUserEmail = 'newuser@gmail.com';

      // Verify user is not in waitlist
      const subscriptionBefore =
        await prismaService.featureSubscription.findFirst({
          where: { email: newUserEmail },
        });
      expect(subscriptionBefore).toBeNull();

      // Create feature request (should auto-join to waitlist)
      await request(getHttpServer(app))
        .post(RoadmapEndpoints.FEATURE_REQUEST)
        .send({
          email: newUserEmail,
          description: 'new feature request',
          priority: FeatureRequestPriority.HIGH,
        })
        .set('Accept', 'application/json')
        .expect(201);

      // Verify user was added to waitlist
      const subscriptionAfter =
        await prismaService.featureSubscription.findFirst({
          where: { email: newUserEmail },
        });
      expect(subscriptionAfter).not.toBeNull();
      expect(subscriptionAfter?.email).toBe(newUserEmail);
    });

    describe('validation', () => {
      it('should return 400 if email is not valid', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEATURE_REQUEST)
          .send({
            email: 'invalid-email',
            description: 'test feature request',
            priority: FeatureRequestPriority.LOW,
          })
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('should return 400 if description is more than 5000 characters', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEATURE_REQUEST)
          .send({
            email: testEmail,
            description: 'a'.repeat(5001),
            priority: FeatureRequestPriority.LOW,
          })
          .set('Accept', 'application/json')
          .expect(400);
      });
    });
  });
});
