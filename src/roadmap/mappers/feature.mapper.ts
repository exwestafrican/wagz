import { Feature, FeatureRequest } from '@/generated/prisma/client';
import { FeatureResponseDto } from '@/roadmap/dto/feature-response.dto';
import { CreateFeatureRequestResponseDto } from '@/roadmap/dto/create-feature-request-response.dto';

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

export function toCreateFeatureRequestResponseDto(
  featureRequest: FeatureRequest,
): CreateFeatureRequestResponseDto {
  return {
    id: featureRequest.id,
    description: featureRequest.description,
    priority: featureRequest.priority,
    createdAt: featureRequest.createdAt,
  };
}

