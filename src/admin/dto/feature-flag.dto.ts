import {
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeatureFlag, Workspace } from '@/generated/prisma/client';
import { FeatureFlagStatus, WorkspaceStatus } from '@/generated/prisma/enums';

const FEATURE_FLAG_KEY_PATTERN = /^[a-z_]+$/;
const MAX_APP_CODES_PER_ENABLE_REQUEST = 500;

export class CreateFeatureFlagDto {
  @IsString()
  @Matches(FEATURE_FLAG_KEY_PATTERN, {
    message: 'key must contain only lowercase letters and underscores',
  })
  @ApiProperty({
    description: 'Unique key (lowercase letters and underscores only)',
    example: 'can_use_whatsapp',
  })
  key: string;

  @IsString()
  @ApiProperty({
    description: 'Feature name',
    example: 'WhatsApp integration',
  })
  name: string;

  @IsString()
  @ApiProperty({
    description: 'Description of the feature',
    example: 'Enabling this feature allows connecting WhatsApp',
  })
  description: string;
}

export class DeleteFeatureFlagDto {
  @IsString()
  @ApiProperty({
    description: 'Key of the feature flag to delete',
    example: 'can_use_whatsapp',
  })
  key: string;
}

export class PatchFeatureFlagStatusDto {
  @IsEnum(FeatureFlagStatus)
  @ApiProperty({
    description: 'Rollout status',
    enum: FeatureFlagStatus,
    example: FeatureFlagStatus.PARTIAL,
  })
  status: FeatureFlagStatus;
}

export class EnableFeatureForAppsDto {
  @IsString()
  @ApiProperty({
    description: 'Key of an existing feature flag in PARTIAL status',
    example: 'can_use_whatsapp',
  })
  key: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_APP_CODES_PER_ENABLE_REQUEST, {
    message: `At most ${MAX_APP_CODES_PER_ENABLE_REQUEST} app codes are allowed per request`,
  })
  @IsString({ each: true })
  @ApiProperty({
    description: 'App (workspace) codes to enable the feature for',
    example: ['ab34c67', 'e8r4z7'],
    type: [String],
    minItems: 1,
    maxItems: MAX_APP_CODES_PER_ENABLE_REQUEST,
  })
  appCodes: string[];
}

export class GetFeatureEnabledAppsQueryDto {
  @IsString()
  @ApiProperty({
    description: 'Key of the feature flag to list enabled apps for',
    example: 'can_use_whatsapp',
  })
  featureKey: string;
}

export class AppDto {
  @IsNumber()
  @ApiProperty({
    description: 'App (workspace) id',
    example: 42,
  })
  appId: number;

  @IsString()
  @ApiProperty({
    description: 'App (workspace) code',
    example: 'ab34c67',
  })
  appCode: string;

  @IsString()
  @ApiProperty({
    description: 'App name',
    example: 'Kobo Mart',
  })
  name: string;

  @IsEnum(WorkspaceStatus)
  @ApiProperty({
    description: 'Workspace status',
    enum: WorkspaceStatus,
    example: WorkspaceStatus.ACTIVE,
  })
  status: WorkspaceStatus;
}

export function toAppDto(workspace: Workspace): AppDto {
  return {
    appId: workspace.id,
    appCode: workspace.code,
    name: workspace.name,
    status: workspace.status,
  };
}

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
