import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MessagesSinceQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID', example: 123 })
  @IsNumber()
  conversationId: number;

  @ApiProperty({
    description:
      'Client-owned cursor. Returns messages with id greater than this value. ' +
      'Bootstrap via chat-history first, then poll with the max message id.',
    example: 456,
  })
  @IsNumber()
  lastReadMessageId: number;
}
