import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Messenger from '@/conversations/messangers/messenger';
import { ConversationParticipant, Message } from '@/generated/prisma/client';

@Injectable()
export default class EnvoyeMessenger implements Messenger {
  constructor(private readonly prisma: PrismaService) {}

  async sendTextMessage(
    conversationId: number,
    senderId: number,
    content: string,
  ): Promise<Message> {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: {
        id: conversationId,
      },
    });

    return this.prisma.message.create({
      data: {
        workspaceCode: conversation.workspaceCode,
        conversationId: conversation.id,
        authorId: senderId,
        content: content,
      },
    });
  }

  private conversationMetaData(
    conversationId: number,
    owner: ConversationParticipant,
    otherParticipant: ConversationParticipant,
  ) {
    return {
      id: conversationId,
      authorId: owner.teammateId,
      recipientId: otherParticipant.teammateId,
    };
  }
  async inbox(teammateId: number, limit = 7) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        conversationParticipants: {
          some: {
            teammateId: teammateId,
          },
        },
      },
      include: {
        conversationParticipants: true,
      },
      orderBy: {
        updatedAt: 'desc', //TODO: this is temporary and we should be depending on lastMessageAt
      },
      take: limit,
    });
    return conversations
      .filter(
        (conversation) => conversation.conversationParticipants.length <= 2,
      )
      .map(({ id: conversationId, conversationParticipants }) => {
        const [firstParticipant, secondParticipant] = conversationParticipants;
        if (firstParticipant.isOwner) {
          return this.conversationMetaData(
            conversationId,
            firstParticipant,
            secondParticipant,
          );
        } else {
          return this.conversationMetaData(
            conversationId,
            secondParticipant,
            firstParticipant,
          );
        }
      });
  }
}
