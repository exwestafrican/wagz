import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatHistoryQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID', example: 123 })
  conversationId: number;

  @ApiProperty({
    description:
      'Optional cursor (sentAt in milliseconds). Pass the sentAt of the oldest message in the current page to load older messages.',
    example: 1718877600000,
    required: false,
  })
  lastMessageSentAt?: number;
}
