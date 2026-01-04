import { ApiProperty } from '@nestjs/swagger';

export class UserVotesResponseDto {
  @ApiProperty({
    description: 'List of feature IDs that the user has voted for',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  featureIds: string[];
}

