import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
// import { FeatureStage } from 'generated/prisma';


export class FeatureDto {
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

  // @ApiProperty({ description: 'What stage are we in for the feature' })
  // @IsEnum(FeatureStage)
  // stage: string;
}
