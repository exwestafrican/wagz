import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureStage, FeatureRequestPriority } from '@/generated/prisma/enums';
import { WaitlistService } from '@/waitlist/waitlist.service';

@Injectable()
export class FeaturesService {
  logger = new Logger(FeaturesService.name);

  constructor(
    private readonly waitlistService: WaitlistService,
    private readonly prismaService: PrismaService,
  ) {}

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

  private async userIsInWaitlist(email: string) {
    const hasSubscribedToMainFeature =
      await this.prismaService.featureSubscription.findFirst({
        where: {
          email: email.toLowerCase().trim(),
        },
      });
    return hasSubscribedToMainFeature ? true : false;
  }

  async createFeatureRequest(
    email: string,
    description: string,
    priority: FeatureRequestPriority,
  ) {
    const normalizedEmail = email.toLowerCase().trim();
    const userIsInWaitlist = await this.userIsInWaitlist(normalizedEmail);

    if (!userIsInWaitlist) {
      this.logger.log(`User not in waitlist, adding them now`);
      await this.waitlistService.join(normalizedEmail);
    }
    return this.prismaService.featureRequest.create({
      data: {
        requestedByUserEmail: normalizedEmail,
        description: description.trim(),
        priority,
      },
    });
  }
}
