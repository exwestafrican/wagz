import { Feature } from '@/generated/prisma/client';
import { FutureFeatureResponseDto } from '../dto/future-features-response.dto';

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

