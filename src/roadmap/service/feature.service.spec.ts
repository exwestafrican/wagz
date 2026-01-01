import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import Unauthorized from '@/common/exceptions/unauthorized';
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
      providers: [FeaturesService],
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

    it('should create a feature request', async () => {
      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: 'test@test.com' },
        }),
      ).toBe(0); // user has no feature requests

      await waitlistService.join('test@test.com');

      await service.createFeatureRequest(
        'test@test.com',
        'test feature request',
        FeatureRequestPriority.LOW,
      );
      expect(
        await prismaService.featureRequest.count({
          where: { requestedByUserEmail: 'test@test.com' },
        }),
      ).toBe(1); // user has one feature request
    });

    it('should throw an error if user is not on wait list', async () => {
      await expect(
        service.createFeatureRequest(
          'sammy@test.com',
          'test feature request',
          FeatureRequestPriority.LOW,
        ),
      ).rejects.toThrow(Unauthorized);
    });
  });
});
