import { ApiProperty } from '@nestjs/swagger';
import { Conversation, ConversationStatus } from '@/generated/prisma/client';

export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: number;

  @ApiProperty({ description: 'Workspace code' })
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation status', enum: ConversationStatus })
  status: ConversationStatus;

  @ApiProperty({ description: 'When the conversation was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the conversation was last updated' })
  updatedAt: Date;
}

export function toConversationResponse(
  conversation: Conversation,
): ConversationResponseDto {
  return {
    id: conversation.id,
    workspaceCode: conversation.workspaceCode,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}
