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
import { Feature } from '@/generated/prisma/client';

describe('RoadmapController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;

  async function setupMainFeature(prismaService: PrismaService) {
    const mainFeature = featureFactory.build({}, { transient: { main: true } });
    await prismaService.feature.create({ data: mainFeature });
  }

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
      await setupMainFeature(prismaService);
      await waitlistService.join(testEmail);
    });

    afterAll(async () => {
      await prismaService.feature.deleteMany();
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

  describe('Toggle votes', () => {
    let feature: Feature;

    beforeEach(async () => {
      feature = featureFactory.build({
        name: 'users can create todolist',
        voteCount: 0,
      });
      await prismaService.feature.create({
        data: feature,
      });
      await setupMainFeature(prismaService);
    });

    afterEach(async () => {
      await prismaService.feature.deleteMany();
    });

    it('should add users votes and return vote count', async () => {
      const response = await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'jenrola@gmail.com',
          featureId: feature.id,
        })
        .set('Accept', 'application/json')
        .expect(200);

      expect((response.body as Feature).voteCount).toBe(1);
    });

    it('should toggle users votes when called multiple times', async () => {
      const firstResponse = await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'ore@gmail.com',
          featureId: feature.id,
        })
        .set('Accept', 'application/json')
        .expect(200);

      expect((firstResponse.body as Feature).voteCount).toBe(1);

      const secondResponse = await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'ore@gmail.com',
          featureId: feature.id,
        })
        .set('Accept', 'application/json')
        .expect(200);

      expect((secondResponse.body as Feature).voteCount).toBe(0);
    });

    it('should return 404 if feature does not exist', async () => {
      await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'ore@gmail.com',
          featureId: 'c14d8c2f-c357-46e4-9342-e6f02a6734c8',
        })
        .set('Accept', 'application/json')
        .expect(404);
    });
  });

  describe('Get user votes', () => {
    let feature1: Feature;
    let feature2: Feature;
    const userEmail = 'voter@example.com';

    beforeEach(async () => {
      await setupMainFeature(prismaService);
      feature1 = featureFactory.build({
        name: 'Feature 1',
        voteCount: 0,
      });
      feature2 = featureFactory.build({
        name: 'Feature 2',
        voteCount: 0,
      });
      await prismaService.feature.createMany({
        data: [feature1, feature2],
      });
      await waitlistService.join(userEmail);
    });

    afterEach(async () => {
      await prismaService.featureVotes.deleteMany();
      await prismaService.feature.deleteMany();
    });

    it('should return empty array when user has no votes', async () => {
      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.USER_VOTES)
        .query({
          email: userEmail,
        })
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.body).toEqual({ featureIds: [] });
    });

    it('should return list of feature IDs that user has voted for', async () => {
      // Add votes for the user
      await prismaService.featureVotes.createMany({
        data: [
          { email: userEmail, featureId: feature1.id },
          { email: userEmail, featureId: feature2.id },
        ],
      });

      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.USER_VOTES)
        .query({
          email: userEmail,
        })
        .set('Accept', 'application/json')
        .expect(200);

      const body = response.body as { featureIds: string[] };

      expect(body.featureIds).toHaveLength(2);
      expect(body.featureIds).toContain(feature1.id);
      expect(body.featureIds).toContain(feature2.id);
    });

    it('should only return votes for the specified user', async () => {
      const otherUserEmail = 'other@example.com';
      await waitlistService.join(otherUserEmail);

      // Add votes for both users
      await prismaService.featureVotes.createMany({
        data: [
          { email: userEmail, featureId: feature1.id },
          { email: otherUserEmail, featureId: feature2.id },
        ],
      });

      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.USER_VOTES)
        .query({
          email: userEmail,
        })
        .set('Accept', 'application/json')
        .expect(200);

      const body = response.body as { featureIds: string[] };
      expect(body.featureIds).toHaveLength(1);
      expect(body.featureIds).toContain(feature1.id);
      expect(body.featureIds).not.toContain(feature2.id);
    });

    it('should return 400 if email is not valid', async () => {
      await request(getHttpServer(app))
        .get(RoadmapEndpoints.USER_VOTES)
        .query({
          email: 'invalid-email',
        })
        .set('Accept', 'application/json')
        .expect(400);
    });
  });
});
