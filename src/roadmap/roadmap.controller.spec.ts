import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapController } from '@/roadmap/roadmap.controller';
import { RoadmapEndpoints } from '@/roadmap/consts';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import request from 'supertest';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FeatureStage } from '@/generated/prisma/enums';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import featureFactory from '@/factories/roadmap/features.factory';
import getHttpServer from '@/test-helpers/get-http-server';

describe('RoadmapController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

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
});
