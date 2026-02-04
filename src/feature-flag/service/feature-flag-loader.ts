import { FeatureFlag } from '../domain/feature-flag';

export default interface FeatureFlagLoader {
  load(): Array<FeatureFlag>;
  enabledFeatures(workspaceCode: string): Array<string>;
}
