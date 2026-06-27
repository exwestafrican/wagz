import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@/generated/prisma/client';
import { Message } from '@/conversations/domain/message';

export class ChatHistoryDto {
  @ApiProperty({ description: 'Message Id', example: 1 })
  id: number;

  @ApiProperty({ description: 'Id of the sender teammate', example: 3 })
  authorId: number;

  @ApiProperty({
    description: 'When the message was sent. timestamp in milliseconds',
    example: 1100101,
  })
  sentAt: number;

  @ApiProperty({
    description: 'message user sent',
    example: ['Hey buddy', "what's up?"],
    type: [String],
  })
  content: string[];

  @ApiProperty({ description: 'text user sent', example: 1 })
  url?: string | undefined;

  @ApiProperty({
    description: 'what type of message is this? text/img',
    example: 1,
  })
  type: string;
}

export function toChatHistoryDto(message: Message): ChatHistoryDto {
  const baseConfig = {
    id: message.id,
    authorId: message.authorId,
    sentAt: message.sentAt.getTime(),
    type: message.messagetype.toString().toLowerCase(),
  };
  const messageType = message.messagetype.toString();
  switch (message.messagetype) {
    case MessageType.TEXT:
      return {
        ...baseConfig,
        content: message.content,
      };
    case MessageType.IMAGE:
      return {
        ...baseConfig,
        url: message.url ?? '',
        content: [],
      };
    default:
      throw new Error(`Unknown message type ${messageType}`);
  }
}
