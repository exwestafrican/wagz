import { ENVOYE_WORKSPACE_ID } from '@/feature-flag/const';

interface FeatureFlagProps {
  key: string;
  name: string;
  description: string;
}

export class FeatureFlag {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly workspaceIds: number[];
  readonly deleted: boolean;

  constructor(featureFlag: FeatureFlagProps) {
    this.key = featureFlag.key;
    this.name = featureFlag.name;
    this.description = featureFlag.description;
    this.workspaceIds = [ENVOYE_WORKSPACE_ID];
    this.deleted = false;
  }

  isEnabled(workspaceId: number) {
    return this.workspaceIds.includes(workspaceId);
  }
  static of(featureFlag: FeatureFlagProps) {
    return new FeatureFlag(featureFlag);
  }
}
