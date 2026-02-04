import { Injectable } from '@nestjs/common';
import FeatureFlagLoader from './feature-flag-loader';
import { FeatureFlag } from '../domain/feature-flag';

@Injectable()
export class LocalFeatureFlagLoader implements FeatureFlagLoader {
  load() {
    return [];
  }
  enabledFeatures(workspaceId: number): Array<string> {
    const featureFlags: FeatureFlag[] = this.load();

    return featureFlags
      .filter((featureFlag) => featureFlag.isEnabled(workspaceId))
      .map((featureFlag) => featureFlag.key);
  }
}
