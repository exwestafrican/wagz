import { Injectable, Logger } from '@nestjs/common';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class WaitlistService {
  logger = new Logger(WaitlistService.name);

  constructor(
    private readonly featureService: FeaturesService,
    private readonly prismaService: PrismaService,
  ) {}

  async join(email: string) {
    const mainFeature = await this.featureService.mainFeature();
    const subscription = await this.prismaService.featureSubscription.create({
      data: {
        email: email,
        featureId: mainFeature.id,
      },
    });
    this.logger.log(
      `successfully joined waitlist for main feature with subscription ${subscription.id}`,
    );
    return subscription;
  }
}
