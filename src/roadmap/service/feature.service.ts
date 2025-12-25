import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureStage } from '@/generated/prisma/enums';

@Injectable()
export class FeaturesService {
  logger = new Logger(FeaturesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async futureFeatures() {
    return this.prismaService.feature.findMany({
      where: {
        stage: {
          in: [FeatureStage.PLANNED, FeatureStage.IN_PROGRESS],
        },
      },
      take: 100, // we intentionally limit the number of features returned to 100
    });
  }

  async mainFeature() {
    return this.prismaService.feature.findFirst({
      where: {
        name: {
          equals: 'whatsApp inbox integration',
          mode: 'insensitive', // Case-insensitive search
        },
      },
    });
  }
}
