import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from '@/generated/prisma/client';

export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation id' })
  id: number;
}

export function toConversationResponse(
  conversation: Conversation,
): ConversationResponseDto {
  return {
    id: conversation.id
  };
}
