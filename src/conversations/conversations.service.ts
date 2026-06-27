import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { notInDbError } from '@/common/error-type';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async runIfConversationParticipant<T>(
    conversationId: number,
    teammateId: number,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      await this.prisma.conversationParticipant.findFirstOrThrow({
        where: { conversationId, teammateId },
        select: { id: true },
      });
      return action();
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
