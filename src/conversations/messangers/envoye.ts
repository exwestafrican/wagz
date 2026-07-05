import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Messenger from '@/conversations/messangers/messenger';
import { Conversation, Message } from '@/generated/prisma/client';
import { isEmpty } from '@/common/utils';
import {
  type Message as DomainMessage,
  toDomainMessage,
} from '@/conversations/domain/message';
import { ConversationsService } from '@/conversations/conversations.service';

@Injectable()
export default class EnvoyeMessenger implements Messenger {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async markAsRead(participantId: number, messageId: number) {
    await this.prisma.conversationParticipant.update({
      where: { id: participantId },
      data: { lastReadMessage: messageId },
    });
  }

  async loadUnReadMessages(
    teammateId: number,
    conversationId: number,
  ): Promise<DomainMessage[]> {
    const participantRow =
      await this.prisma.conversationParticipant.findFirstOrThrow({
        where: { teammateId, conversationId },
        select: { lastReadMessage: true, id: true },
      });

    const lastReadMessage = participantRow.lastReadMessage;

    const messages = await this.prisma.message.findMany({
      orderBy: {
        sentAt: 'desc',
      },
      where: {
        conversationId,
        ...(lastReadMessage != null && {
          id: {
            gt: lastReadMessage,
          },
        }),
      },
    });

    if (!isEmpty(messages)) {
      await this.markAsRead(participantRow.id, messages[0].id);
    }

    return messages.map((message) => toDomainMessage(message));
  }

  // TODO: add load previous messages.
  // TODO: add load most recent messages.
  // TODO: remove chat history.

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
    recipientTeammateIds: number[],
    workspaceCode: string,
    openingMessage: string[],
    sentAt: Date,
  ): Promise<Conversation> {
    const participantIds = Array.from(
      new Set([senderId, ...recipientTeammateIds]),
    );
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceCode: workspaceCode,
        participantSignature: this.conversationsService.participantSignature(
          workspaceCode,
          participantIds,
        ),
      },
    });

    if (participantIds.length === 1) {
      // if only one participant, then participant is owner
      await this.prisma.conversationParticipant.create({
        data: {
          workspaceCode,
          conversationId: conversation.id,
          teammateId: senderId,
          isOwner: true,
        },
      });
    } else {
      const counterParties = participantIds
        .map((participantId) => {
          if (participantId !== senderId) {
            return {
              workspaceCode: workspaceCode,
              conversationId: conversation.id,
              teammateId: participantId,
            };
          }
        })
        .filter((c) => c !== undefined);

      await this.prisma.conversationParticipant.createMany({
        data: [
          {
            workspaceCode: workspaceCode,
            conversationId: conversation.id,
            teammateId: senderId,
            isOwner: true,
          },
          ...counterParties,
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
    const messageContent = content.join('\n');
    return this.prisma.message.create({
      data: {
        workspaceCode: conversation.workspaceCode,
        conversationId: conversation.id,
        authorId: senderId,
        content: messageContent,
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
    return conversations.map(
      ({ id: conversationId, conversationParticipants: participants }) => {
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
      },
    );
  }
}
