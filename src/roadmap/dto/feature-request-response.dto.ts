import { ApiProperty } from '@nestjs/swagger';
import { FeatureRequestPriority } from '@/generated/prisma/enums';

export class FeatureRequestResponseDto {
  @ApiProperty({ description: 'Id of the created feature request' })
  id: number;

  @ApiProperty({
    description: 'Description of the feature request',
    example: 'Add support for dark mode',
  })
  description: string;

  @ApiProperty({
    description: 'Priority of the feature request',
    enum: FeatureRequestPriority,
  })
  priority: FeatureRequestPriority;

  @ApiProperty({
    description: 'Timestamp when the feature request was created',
    type: String,
    format: 'date-time',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}
