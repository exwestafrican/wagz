import { Feature, FeatureRequest } from '@/generated/prisma/client';
import { FeatureResponseDto } from '@/roadmap/dto/feature-response.dto';
import { FeatureRequestResponseDto } from '@/roadmap/dto/feature-request-response.dto';

export function toFeatureResponseDto(
  feature: Feature,
): FeatureResponseDto {
  return {
    id: feature.id,
    name: feature.name,
    icon: feature.icon,
    stage: feature.stage,
    voteCount: feature.voteCount,
  };
}

export function toFeatureRequestResponseDto(
  featureRequest: FeatureRequest,
): FeatureRequestResponseDto {
  return {
    id: featureRequest.id,
    description: featureRequest.description,
    priority: featureRequest.priority,
    createdAt: featureRequest.createdAt,
  };
}

