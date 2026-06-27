import { MessageType } from '@/generated/prisma/enums';
import { Message as PrismaMessage } from '@/generated/prisma/client';

export type Message = {
  id: number;
  url: string | null;
  authorId: number;
  sentAt: Date;
  content: string[];
  messagetype: MessageType;
};

export function toDomainMessage(message: PrismaMessage) {
  return {
    id: message.id,
    url: message.url,
    authorId: message.authorId,
    sentAt: message.sentAt,
    content: message.content.split('\n'),
    messagetype: message.messagetype,
  };
}
