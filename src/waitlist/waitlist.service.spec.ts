import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoadmapModule } from '@/roadmap/roadmap.module';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import featureFactory from '@/factories/roadmap/features.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { faker } from '@faker-js/faker';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import { Feature } from '@/generated/prisma/client';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(), // Provides ConfigService
        PrismaModule,
        RoadmapModule,
      ],
      providers: [WaitlistService],
    }).compile();
    app = await createTestApp(module);
    service = app.get<WaitlistService>(WaitlistService);
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('join', () => {
    let mainFeature: Feature;

    beforeAll(async () => {
      mainFeature = featureFactory.build({}, { transient: { main: true } });
      await prismaService.feature.create({ data: mainFeature });
    });

    it('join waitlist should create subscription to main feature', async () => {
      const userEmail = faker.internet.email();
      const countBeforeUserJoinsWaitList =
        await prismaService.featureSubscription.count({
          where: { email: userEmail },
        });
      expect(countBeforeUserJoinsWaitList).toBe(0);
      await service.join(userEmail);
      const countAfterUserJoinsWaitList =
        await prismaService.featureSubscription.count({
          where: { email: userEmail },
        });
      expect(countAfterUserJoinsWaitList).toBe(1);
    });

    it('should return conflict if user is already in waitlist', async () => {
      const userEmail = faker.internet.email();
      await service.join(userEmail);
      await expect(service.join(userEmail)).rejects.toThrow(
        ItemAlreadyExistsInDb,
      );
    });
  });
});
