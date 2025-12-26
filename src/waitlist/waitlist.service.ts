import { Injectable, Logger } from '@nestjs/common';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import PRISMA_CODES from '@/prisma/consts';

@Injectable()
export class WaitlistService {
  logger = new Logger(WaitlistService.name);

  constructor(
    private readonly featureService: FeaturesService,
    private readonly prismaService: PrismaService,
  ) {}

  async join(email: string) {
    const mainFeature = await this.featureService.mainFeature();

    try {
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_CODES.EXISTS_IN_DB
      ) {
        this.logger.warn(`User ${email} already on waitlist`);
        throw new ItemAlreadyExistsInDb('user already on waitlist');
      }
      throw error;
    }
  }
}
