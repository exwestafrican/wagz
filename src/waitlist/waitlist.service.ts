import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import PRISMA_CODES from '@/prisma/consts';
import { MAIN_FEATURE } from '@/roadmap/consts';
import NotFoundInDb from '@/common/exceptions/not-found';

@Injectable()
export class WaitlistService {
  logger = new Logger(WaitlistService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private async mainFeature() {
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
        if (err.code === PRISMA_CODES.NOT_FOUND) {
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

  async join(email: string) {
    const mainFeature = await this.mainFeature();

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
        throw new ItemAlreadyExistsInDb('user already on waitlist');
      }
      throw error;
    }
  }

  async userIsInWaitlist(email: string): Promise<boolean> {
    const hasSubscribedToMainFeature =
      await this.prismaService.featureSubscription.findFirst({
        where: {
          email: email,
          feature: await this.mainFeature(),
        },
      });
    return hasSubscribedToMainFeature ? true : false;
  }
}
