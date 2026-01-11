import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapController } from '@/roadmap/roadmap.controller';
import { RoadmapEndpoints } from '@/roadmap/consts';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import request from 'supertest';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { FeatureRequestPriority, FeatureStage } from '@/generated/prisma/enums';
import { FeatureResponseDto } from '@/roadmap/dto/feature-response.dto';
import featureFactory from '@/factories/roadmap/features.factory';
import getHttpServer from '@/test-helpers/get-http-server';
import { WaitlistModule } from '@/waitlist/waitlist.module';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { Feature } from '@/generated/prisma/client';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';
import { FeedbackService } from './service/feedback.service';
import { addFeature, setupMainFeature } from '@/test-helpers/feature-helpers';

describe('RoadmapController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, WaitlistModule],
      controllers: [RoadmapController],
      providers: [FeaturesService, WaitlistService, FeedbackService],
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

      const body = response.body as FeatureResponseDto[];
      expect(body).toHaveLength(2);
      const stages: FeatureStage[] = body.map((feature) => feature.stage);
      expect(stages).toEqual(
        expect.arrayContaining([
          FeatureStage.PLANNED,
          FeatureStage.IN_PROGRESS,
        ]),
      );
      expect(stages).toHaveLength(2); // Ensure no extra items
    });

    it('should return response matching FutureFeatureResponseDto structure', async () => {
      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.FUTURE_FEATURES)
        .set('Accept', 'application/json')
        .expect(200);

      const features = response.body as FutureFeatureResponseDto[];

      expect(features.length).toBeGreaterThan(0);

      features.forEach((feature) => {
        expect(feature).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          icon: expect.any(String),
          stage: expect.any(String),
          voteCount: expect.any(Number),
        });
      });
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
        const response = await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEATURE_REQUEST)
          .send({
            email: 'invalid-email',
            description: 'test feature request',
            priority: FeatureRequestPriority.LOW,
          })
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['email']);
      });

      it('should return 400 if description is more than 5000 characters', async () => {
        const response = await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEATURE_REQUEST)
          .send({
            email: testEmail,
            description: 'a'.repeat(5001),
            priority: FeatureRequestPriority.LOW,
          })
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['description']);
      });
    });

    it('should return response matching FeatureRequestResponseDto structure', async () => {
      const response = await request(getHttpServer(app))
        .post(RoadmapEndpoints.FEATURE_REQUEST)
        .send({
          email: testEmail,
          description: 'test feature request for structure validation',
          priority: FeatureRequestPriority.MEDIUM,
        })
        .set('Accept', 'application/json')
        .expect(201);

      const featureRequest =
        response.body as FeatureRequestResponseDto;

      expect(featureRequest).toMatchObject({
        id: expect.any(Number),
        description: expect.any(String),
        priority: expect.any(String),
        createdAt: expect.any(String),
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

      const toggleVoteResponse = response.body as FeatureResponseDto;
      expect(toggleVoteResponse.voteCount).toBe(1);
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

      const firstToggleVoteResponse = firstResponse.body as FeatureResponseDto;
      expect(firstToggleVoteResponse.voteCount).toBe(1);

      const secondResponse = await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'ore@gmail.com',
          featureId: feature.id,
        })
        .set('Accept', 'application/json')
        .expect(200);

      const secondToggleVoteResponse =
        secondResponse.body as FeatureResponseDto;
      expect(secondToggleVoteResponse.voteCount).toBe(0);
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

    it('should return response matching FeatureResponseDto structure', async () => {
      const response = await request(getHttpServer(app))
        .post(RoadmapEndpoints.VOTE)
        .send({
          email: 'test@example.com',
          featureId: feature.id,
        })
        .set('Accept', 'application/json')
        .expect(200);

      const toggleVoteResponse = response.body as FeatureResponseDto;

      expect(toggleVoteResponse).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        icon: expect.any(String),
        stage: expect.any(String),
        voteCount: expect.any(Number),
      });
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
      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.USER_VOTES)
        .query({
          email: 'invalid-email',
        })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['email']);
    });

    it('should return response matching UserVotesResponseDto structure', async () => {
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

      const userVotesResponse = response.body as UserVotesResponseDto;

      expect(userVotesResponse).toMatchObject({
        featureIds: expect.any(Array),
      });
    });
  });

  describe('Create feedback', () => {
    describe('Bad request', () => {
      it('should return 400 if email is not valid', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEEDBACK)
          .send({
            email: 'invalid-email',
            feedback: 'test feature request',
            featureId: 'c14d8c2f-c357-46e4-9342-e6f02a6734c8',
          })
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('should return 400 if feedback is greater than 5000 characters', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEEDBACK)
          .send({
            email: 'laura@envoye.co',
            feedback: 'f'.repeat(5001),
            featureId: 'c14d8c2f-c357-46e4-9342-e6f02a6734c8',
          })
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('should return 400 if featureID is not UUID', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEEDBACK)
          .send({
            email: 'laura@envoye.co',
            feedback: 'test feature request',
            featureId: 'hello',
          })
          .set('Accept', 'application/json')
          .expect(400);
      });
    });

    describe('With valid input', () => {
      const lauraEmail = 'laura@envoye.co';
      let feature: Feature;
      beforeEach(async () => {
        await prismaService.featureFeedback.deleteMany();
        await setupMainFeature(prismaService);
        feature = await addFeature(prismaService, 'testing feature');
      });

      afterEach(async () => {
        await prismaService.feature.deleteMany();
      });

      it('creates feedback for user already in waitlist', async () => {
        await waitlistService.join(lauraEmail);
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEEDBACK)
          .send({
            email: lauraEmail,
            feedback: 'test feature request',
            featureId: feature.id,
          })
          .set('Accept', 'application/json')
          .expect(HttpStatus.CREATED);
        const userFeedback = await prismaService.featureFeedback.findFirst({
          where: { email: lauraEmail, featureId: feature.id },
        });
        expect(userFeedback).not.toBeNull();
      });

      it('creates feedback for user not in waitlist', async () => {
        await request(getHttpServer(app))
          .post(RoadmapEndpoints.FEEDBACK)
          .send({
            email: lauraEmail,
            feedback: 'test feature request',
            featureId: feature.id,
          })
          .set('Accept', 'application/json')
          .expect(HttpStatus.CREATED);
        const userFeedback = await prismaService.featureFeedback.findFirst({
          where: { email: lauraEmail, featureId: feature.id },
        });
        expect(userFeedback).not.toBeNull();
      });
    });
  });
});
