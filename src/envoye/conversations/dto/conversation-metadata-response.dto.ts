import { ApiProperty } from '@nestjs/swagger';

export class ConversationMetadataResponseDto {
  @ApiProperty({ description: 'Conversation ID', example: 123 })
  id: number;

  @ApiProperty({ description: 'author teammate ID', example: 10 })
  authorId: number;

  @ApiProperty({
    description: 'Other participant teammate IDs in the conversation',
    example: [12],
    type: [Number],
  })
  participantIds: number[];
}
