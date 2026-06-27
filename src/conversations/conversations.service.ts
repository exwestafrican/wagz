import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { notInDbError } from '@/common/error-type';
import { isEmpty } from '@/common/utils';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async runIfConversationParticipant<T>(
    conversationId: number,
    teammateId: number,
    action: () => Promise<T>,
  ): Promise<T> {
    const participant = await this.fetchParticipantsOrThrow(
      conversationId,
      teammateId,
    );

    if (!isEmpty(participant)) {
      return action();
    }

    throw new ForbiddenException();
  }

  private async fetchParticipantsOrThrow(
    conversationId: number,
    teammateId: number,
  ): Promise<{ id: number }> {
    try {
      return await this.prisma.conversationParticipant.findFirstOrThrow({
        where: { conversationId, teammateId },
        select: { id: true },
      });
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
