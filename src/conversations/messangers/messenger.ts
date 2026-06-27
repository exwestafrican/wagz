import { type Message as DomainMessage } from '@/conversations/domain/message';
import { type Message } from '@/generated/prisma/client';

export default interface Messenger {
  sendTextMessage(
    conversationId: number,
    senderId: number,
    content: string[],
    sentAt: Date,
  ): Promise<Message>;

  chatHistory(
    conversationId: number,
    limit: number,
    lastMessageId?: number,
  ): Promise<DomainMessage[]>;
}
