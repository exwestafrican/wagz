import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';

interface FeatureFlagProps {
  key: string;
  name: string;
  description: string;
}

export class FeatureFlag {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly workspaceCodes: string[];
  readonly deleted: boolean;

  constructor(featureFlag: FeatureFlagProps) {
    this.key = featureFlag.key;
    this.name = featureFlag.name;
    this.description = featureFlag.description;
    this.workspaceCodes = [ENVOYE_WORKSPACE_CODE];
    this.deleted = false;
  }

  isEnabled(workspaceCode: string) {
    return this.workspaceCodes.includes(workspaceCode);
  }
  static of(featureFlag: FeatureFlagProps) {
    return new FeatureFlag(featureFlag);
  }
}
