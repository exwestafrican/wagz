import { ApiProperty } from '@nestjs/swagger';
import { FeatureStage } from '@/generated/prisma/enums';

export class FeatureResponseDto {
  @ApiProperty({ description: 'Id of feature' })
  id: string;

  @ApiProperty({
    description: 'Short title for feature',
    example: 'E.g Messaging via whatsapp',
  })
  name: string;

  @ApiProperty({
    description:
      'string that maps to what icon to use name can be found here: https://lucide.dev/icons/',
    example: 'check-check',
  })
  icon: string;

  @ApiProperty({ description: 'What stage are we in for the feature' })
  stage: FeatureStage;

  @ApiProperty({
    description: 'Current vote count for the feature',
    example: 5,
  })
  voteCount: number;
}

