import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureStage } from '@/generated/prisma/enums';
import PRISMA_CODES from '@/prisma/consts';
import { Prisma } from '@/generated/prisma/client';
import NotFoundInDb from '@/common/exceptions/not-found';
import { MAIN_FEATURE } from '@/roadmap/consts';

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
    const featureName = MAIN_FEATURE;
    try {
      return this.prismaService.feature.findFirstOrThrow({
        where: {
          name: {
            equals: featureName,
            mode: 'insensitive', // Case-insensitive search
          },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if ((err.code = PRISMA_CODES.NOT_FOUND)) {
          this.logger.error(`feature ${featureName} not found`);
          throw new NotFoundInDb('main feature not found');
        }
      }
      this.logger.error(
        `unknown error ${err} while fetching feature ${featureName}`,
      );
      throw err;
    }
  }
}
