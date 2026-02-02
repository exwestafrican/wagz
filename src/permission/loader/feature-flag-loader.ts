import { FeatureFlag } from '@/feature-flag/domain/feature-flag';

export const FEATURE_FLAG_LOADER = Symbol('FEATURE_FLAG_LOADER');

export interface FeatureFlagLoader {
  load(): FeatureFlag[];
}
