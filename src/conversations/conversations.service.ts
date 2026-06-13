import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Conversation } from '@/generated/prisma/client';
import { ConcurrentLimit } from '@/common/concurrent-runner';

@Injectable()
export class ConversationsService {
  private static readonly CONVERSATION_CONCURRENCY = 3;

  constructor(private readonly prisma: PrismaService) {}

  async createDirectMessage(
    senderId: number,
    recipientTeammateId: number,
    workspaceCode: string,
  ) {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceCode: workspaceCode,
      },
    });

    await this.prisma.conversationParticipant.createMany({
      data: [
        {
          workspaceCode: workspaceCode,
          conversationId: conversation.id,
          teammateId: senderId,
          isOwner: true,
        },
        {
          workspaceCode: workspaceCode,
          conversationId: conversation.id,
          teammateId: recipientTeammateId,
        },
      ],
    });

    return conversation;
  }

  async createDirectMessageWithSelf(
    workspaceCode: string,
    teammateId: number,
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceCode,
      },
    });

    await this.prisma.conversationParticipant.create({
      data: {
        workspaceCode,
        conversationId: conversation.id,
        teammateId,
        isOwner: true,
      },
    });

    return conversation;
  }

  async createDirectMessageWithTeammates(
    senderId: number,
    teammateIds: number[],
    workspaceCode: string,
  ): Promise<void> {
    const limit = ConcurrentLimit(
      ConversationsService.CONVERSATION_CONCURRENCY,
      teammateIds.length,
    );

    await Promise.allSettled(
      teammateIds.map((teammateId) =>
        limit.run(() =>
          this.createDirectMessageForTeammate(
            senderId,
            teammateId,
            workspaceCode,
          ),
        ),
      ),
    );
  }

  private async createDirectMessageForTeammate(
    senderId: number,
    recipientTeammateId: number,
    workspaceCode: string,
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceCode,
      },
    });

    await this.prisma.conversationParticipant.createMany({
      data: [
        {
          workspaceCode,
          conversationId: conversation.id,
          teammateId: senderId,
          isOwner: true,
        },
        {
          workspaceCode,
          conversationId: conversation.id,
          teammateId: recipientTeammateId,
        },
      ],
    });

    return conversation;
  }
}
