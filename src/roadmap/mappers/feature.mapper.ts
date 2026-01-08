import { Feature, FeatureRequest } from '@/generated/prisma/client';
import { FutureFeatureResponseDto } from '../dto/future-features-response.dto';
import { CreateFeatureRequestResponseDto } from '../dto/create-feature-request-response.dto';

export function toFutureFeatureResponseDto(
  feature: Feature,
): FutureFeatureResponseDto {
  return {
    id: feature.id,
    name: feature.name,
    icon: feature.icon,
    stage: feature.stage,
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

