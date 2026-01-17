import {
  Feature,
  FeatureFeedback,
  FeatureRequest,
} from '@/generated/prisma/client';
import { FeatureResponseDto } from '@/roadmap/dto/feature-response.dto';
import { FeatureRequestResponseDto } from '@/roadmap/dto/feature-request-response.dto';
import { UserVotesResponseDto } from '@/roadmap/dto/user-votes-response.dto';
import FeatureFeedbackResponse from '../interfaces/feature-feedback-response';

export function toFeatureResponseDto(feature: Feature): FeatureResponseDto {
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

export function toUserVotesResponseDto(
  featureIds: string[],
): UserVotesResponseDto {
  return { featureIds };
}

export function toFeatureFeedbackDto(
  featureFeedback: FeatureFeedback,
): FeatureFeedbackResponse {
  return {
    id: featureFeedback.id,
    feedback: featureFeedback.text,
    email: featureFeedback.email,
    featureId: featureFeedback.featureId,
  };
}
