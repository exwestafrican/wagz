import { Message } from '@/generated/prisma/client';

export default interface Messenger {
  sendTextMessage(
    conversationId: number,
    senderId: number,
    content: string[],
    sentAt: Date,
  ): Promise<Message>;
}
