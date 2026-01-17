import { PrismaService } from '@/prisma/prisma.service';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FeedbackService {
  logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly waitlistService: WaitlistService,
  ) {}

  async sendFeedback(email: string, feedback: string, featureId: string) {
    if (!(await this.waitlistService.userIsInWaitlist(email))) {
      await this.waitlistService.join(email);
    }
    return this.prismaService.featureFeedback.create({
      data: {
        email: email,
        text: feedback,
        featureId: featureId,
      },
    });
  }
}
