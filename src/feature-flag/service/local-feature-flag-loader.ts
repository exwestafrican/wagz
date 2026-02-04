import { Injectable } from '@nestjs/common';
import FeatureFlagLoader from './feature-flag-loader';
import { FeatureFlag } from '../domain/feature-flag';

@Injectable()
export class LocalFeatureFlagLoader implements FeatureFlagLoader {
  load() {
    return [];
  }
  enabledFeatures(workspaceCode: string): Array<string> {
    const featureFlags: FeatureFlag[] = this.load();

    return featureFlags
      .filter((featureFlag) => featureFlag.isEnabled(workspaceCode))
      .map((featureFlag) => featureFlag.key);
  }
}
