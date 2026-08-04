import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID', example: 123 })
  @IsInt()
  conversationId: number;

  @ApiProperty({
    description:
      'Most recent message id the client has read. Advances the server cursor only when greater than the stored value.',
    example: 456,
  })
  @IsInt()
  mostRecentMessageId: number;
}
