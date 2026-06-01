import { ApiProperty } from '@nestjs/swagger';
import { Message, MessageType } from '@/generated/prisma/client';

export class MessageResponseDto {
  @ApiProperty({ description: 'Message id' })
  id: number;

  @ApiProperty({ description: 'Conversation id the message belongs to' })
  conversationId: number;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Teammate id of the sender' })
  senderTeammateId: number;

  @ApiProperty({ description: 'Message type', enum: MessageType })
  messagetype: MessageType;

  @ApiProperty({ description: 'When the message was created' })
  createdAt: Date;
}

export function toMessageResponse(message: Message): MessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    senderTeammateId: message.senderTeammateId,
    messagetype: message.messagetype,
    createdAt: message.createdAt,
  };
}
