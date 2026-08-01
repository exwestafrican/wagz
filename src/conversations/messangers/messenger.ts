import { type Message as DomainMessage } from '@/conversations/domain/message';
import { Conversation, type Message } from '@/generated/prisma/client';

export default interface Messenger {
  sendOpeningTextMessage(
    senderId: number,
    recipientTeammateId: number[],
    workspaceCode: string,
    openingMessage: string[],
    sentAt: Date,
  ): Promise<Conversation>;

  sendTextMessage(
    conversationId: number,
    senderId: number,
    content: string[],
    sentAt: Date,
  ): Promise<Message>;

  chatHistory(
    conversationId: number,
    limit: number,
    lastMessageSentAt?: number,
  ): Promise<DomainMessage[]>;
}
