import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async runIfConversationParticipant<T>(
    conversationId: number,
    teammateId: number,
    action: () => Promise<T>,
  ): Promise<T> {
    const isParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, teammateId },
      select: { id: true },
    });

    if (isParticipant) {
      return action();
    }

    throw new ForbiddenException();
  }
}
