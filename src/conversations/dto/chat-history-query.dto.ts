import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatHistoryQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID', example: 123 })
  conversationId: number;

  @ApiProperty({ description: 'message id to load from', example: 10 })
  lastMessageSentAt?: number;
}
