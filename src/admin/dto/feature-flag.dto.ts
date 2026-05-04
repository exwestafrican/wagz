import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeatureFlag } from '@/generated/prisma/client';

export default class FeatureFlagDto {
  @IsString()
  @ApiProperty({
    description: 'Feature Key',
    example: 'can_use_whatsapp',
  })
  key: string;

  @IsString()
  @ApiProperty({
    description: 'Feature name',
    example: 'Backfill Normalised usernames',
  })
  name: string;

  @IsString()
  @ApiProperty({
    description: 'Description of feature',
    example: 'Enabling this feature gives user the ability to connect whatsapp',
  })
  description: string;

  @IsString()
  @ApiProperty({
    description: 'Status of feature flag',
    example: 'global',
  })
  status: string;
}

export function toFeatureFlagDto(featureFlag: FeatureFlag) {
  return {
    key: featureFlag.key,
    name: featureFlag.name,
    description: featureFlag.description,
    status: featureFlag.status,
  };
}
