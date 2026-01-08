import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureStage, FeatureRequestPriority } from '@/generated/prisma/enums';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { Feature, FeatureVotes, Prisma } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';
import NotFoundInDb from '@/common/exceptions/not-found';

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
          email: email,
        },
      });
    return hasSubscribedToMainFeature ? true : false;
  }

  async createFeatureRequest(
    email: string,
    description: string,
    priority: FeatureRequestPriority,
  ) {
    const userIsInWaitlist = await this.userIsInWaitlist(email);

    if (!userIsInWaitlist) {
      this.logger.log(`User not in waitlist, adding them now`);
      await this.waitlistService.join(email);
    }
    return this.prismaService.featureRequest.create({
      data: {
        requestedByUserEmail: email,
        description: description.trim(),
        priority,
      },
    });
  }

  private async addVote(
    tx: Prisma.TransactionClient,
    email: string,
    featureId: string,
  ) {
    await tx.featureVotes.create({
      data: {
        email: email,
        featureId: featureId,
      },
    });
    await tx.feature.update({
      where: { id: featureId },
      data: { voteCount: { increment: 1 } },
    });
  }

  private async removeVote(
    tx: Prisma.TransactionClient,
    existingVote: FeatureVotes,
  ) {
    await tx.featureVotes.delete({
      where: {
        id: existingVote.id,
      },
    });
    await tx.feature.update({
      where: { id: existingVote.featureId },
      data: { voteCount: { decrement: 1 } },
    });
  }

  async toggleVote(email: string, featureId: string): Promise<Feature> {
    try {
      await this.prismaService.$transaction(async (tx) => {
        const existingVote = await tx.featureVotes.findUnique({
          where: {
            email_featureId: {
              email: email,
              featureId: featureId,
            },
          },
        });

        if (existingVote) {
          await this.removeVote(tx, existingVote);
        } else {
          await this.addVote(tx, email, featureId);
        }
      });

      const userIsInWaitlist = await this.userIsInWaitlist(email);

      if (!userIsInWaitlist) {
        this.logger.log(`User not in waitlist, adding them now`);
        await this.waitlistService.join(email);
      }

      return this.prismaService.feature.findFirstOrThrow({
        where: { id: featureId },
      });
    } catch (error) {
      this.logger.error(`Transaction failed: ${error}`);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_CODES.FOREIGN_KEY_CONSTRAINT_VIOLATION
      ) {
        this.logger.error(
          `Feature does not exist (FK constraint) ${featureId}`,
        );
        throw new NotFoundInDb('Feature does not exist (FK constraint)');
      } else if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_CODES.NOT_FOUND
      ) {
        this.logger.error(`Feature does not exist ${featureId}`);
        throw new NotFoundInDb('Feature does not exist');
      }
      throw error;
    }
  }

  async getUserVotes(email: string): Promise<string[]> {
    const votes = await this.prismaService.featureVotes.findMany({
      where: {
        email: email,
      },
      select: {
        featureId: true,
      },
    });

    return votes.map((vote) => vote.featureId);
  }
}
