import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Conversation } from '@/generated/prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(
    workspaceCode: string,
    recipientTeammateId: number,
    senderEmail: string,
  ): Promise<Conversation> {
    const sender = await this.prisma.teammate.findFirstOrThrow({
      where: { workspaceCode: workspaceCode, email: senderEmail },
    });

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
          teammateId: sender.id,
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

  async createSelfConversation(
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

  async createConversationForTeammates(
    workspaceCode: string,
    teammateIds: number[],
    requesterTeammateEmail: string,
  ): Promise<void> {
    if (teammateIds.length === 0) {
      return;
    }
    //didnt wrap it in a transaction as if it fails dont think its critical. 
    await Promise.all(
      teammateIds.map((teammateId) =>
        this.createConversation(
          workspaceCode,
          teammateId,
          requesterTeammateEmail,
        ),
      ),
    );
  }
}
