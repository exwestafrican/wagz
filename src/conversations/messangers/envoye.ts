import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Messenger from '@/conversations/messangers/messenger';
import { Message } from '@/generated/prisma/client';

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

  async conversations(workspaceCode: string, teammateId: number, limit = 7) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        workspaceCode,
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
      .map(({ id: conversationId, conversationParticipants: participants }) => {
        const owner = participants.find((participant) => participant.isOwner);
        const otherParticipants = participants.filter(
          (participant) => !participant.isOwner,
        );

        if (!owner) {
          throw Error(
            `Malformed conversation participants for conversation; id=${conversationId}`,
          );
        }

        return {
          id: conversationId,
          authorId: owner.teammateId,
          participantIds: otherParticipants.map(
            (participant) => participant.teammateId,
          ),
        };
      });
  }
}
