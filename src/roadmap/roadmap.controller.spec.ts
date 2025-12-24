import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapController } from './roadmap.controller';
import { RoadmapEndpoints } from './consts';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { createTestApp } from '../test-helpers/test-app';
import request from 'supertest';
import { FeaturesService } from './service/feature.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FeatureStage } from '../generated/prisma/enums';

describe('RoadmapController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  function getHttpServer(app: INestApplication): Server {
    return app.getHttpServer() as unknown as Server;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadmapController],
      providers: [FeaturesService, PrismaService, ConfigService],
    }).compile();

    app = await createTestApp(module);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Future Features', () => {
    beforeEach(async () => {
      await prismaService.feature.createMany({
        data: [
          {
            name: 'Feature 1',
            stage: FeatureStage.PLANNED,
            votes: 0,
            icon: 'check-check',
          },
          {
            name: 'Feature 2',
            stage: FeatureStage.IN_PROGRESS,
            votes: 0,
            icon: 'check-check',
          },
          {
            name: 'Feature 3',
            stage: FeatureStage.COMPLETED,
            votes: 0,
            icon: 'check-check',
          },
        ],
      });
    });

    it('should return a list of future features only (planned and completed)', async () => {
      const response = await request(getHttpServer(app))
        .get(RoadmapEndpoints.FUTURE_FEATURES)
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.body).toHaveLength(2);
      const stages: FeatureStage[] = response.body.map(
        (feature) => feature.stage,
      );
      expect(stages).toEqual(
        expect.arrayContaining([FeatureStage.PLANNED, FeatureStage.COMPLETED]),
      );
      expect(stages).toHaveLength(2); // Ensure no extra items
    });
  });
});
