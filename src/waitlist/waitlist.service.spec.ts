import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { FeaturesService } from '@/roadmap/service/feature.service';

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(), // Provides ConfigService
        PrismaModule, // Prov
      ],
      providers: [WaitlistService, FeaturesService],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
