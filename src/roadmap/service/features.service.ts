import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
// import { Feature, FeatureStage } from 'src/generated/prisma';

@Injectable()
export class FeaturesService {
  logger = new Logger(FeaturesService.name);

  constructor(private readonly prismaService: PrismaService) {}


  async featureFeatures() {
    // return await this.prismaService.feature.findMany({
    //   where: {
    //     stage: {
    //       in: [FeatureStage.PLANNED, FeatureStage.COMPLETED],
    //     },
    //   },
    // });
  }
}
