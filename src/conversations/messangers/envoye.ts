import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Messenger from '@/conversations/messangers/messenger';
import { Conversation, Message } from '@/generated/prisma/client';
import { isEmpty, isSame } from '@/common/utils';
import {
  type Message as DomainMessage,
  toDomainMessage,
} from '@/conversations/domain/message';

@Injectable()
export default class EnvoyeMessenger implements Messenger {
  constructor(private readonly prisma: PrismaService) {}

  async chatHistory(
    conversationId: number,
    limit: number,
    lastMessageSentAt?: number,
  ): Promise<DomainMessage[]> {
    // maximum permissible limit here is 100 please do not exceed.
    //TODO: add a way of validating limit, or use min(100, numberUserProvided)
    const messages = await this.prisma.message.findMany({
      take: limit,
      orderBy: {
        sentAt: 'desc',
      },
      where: {
        conversationId,
        ...(lastMessageSentAt != null && {
          sentAt: {
            lt: new Date(lastMessageSentAt).toISOString(),
          },
        }),
      },
    });
    return messages.map((message) => toDomainMessage(message)).reverse();
  }

  async sendOpeningTextMessage(
    senderId: number,
    recipientTeammateId: number,
    workspaceCode: string,
    openingMessage: string[],
    sentAt: Date,
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceCode: workspaceCode,
      },
    });

    if (isSame(senderId, recipientTeammateId)) {
      await this.prisma.conversationParticipant.create({
        data: {
          workspaceCode,
          conversationId: conversation.id,
          teammateId: senderId,
          isOwner: true,
        },
      });
    } else {
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
    }

    if (!isEmpty(openingMessage)) {
      await this.sendTextMessageWithConversation(
        conversation,
        senderId,
        openingMessage,
        sentAt,
      );
    }

    return conversation;
  }

  async sendTextMessage(
    conversationId: number,
    senderId: number,
    content: string[],
    sentAt: Date,
  ): Promise<Message> {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: {
        id: conversationId,
      },
    });
    return await this.sendTextMessageWithConversation(
      conversation,
      senderId,
      content,
      sentAt,
    );
  }

  private async sendTextMessageWithConversation(
    conversation: Conversation,
    senderId: number,
    content: string[],
    sentAt: Date,
  ) {
    const message = content.join('\n');
    return this.prisma.message.create({
      data: {
        workspaceCode: conversation.workspaceCode,
        conversationId: conversation.id,
        authorId: senderId,
        content: message,
        sentAt,
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
