import { FeatureStatus } from '@/feature-flag/domain/feature-status';

interface FeatureFlagProps {
  key: string;
  name: string;
  description: string;
  addedBy: string;
  status: FeatureStatus;
  workspaceID: number[];
  deleted: boolean;
}

export class FeatureFlag {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly addedBy: string;
  readonly status: FeatureStatus;
  readonly workspaceID: number[];
  readonly deleted: boolean;

  constructor(featureFlag: FeatureFlagProps) {
    this.key = featureFlag.key;
    this.name = featureFlag.name;
    this.description = featureFlag.description;
    this.addedBy = featureFlag.addedBy;
    this.status = featureFlag.status;
    this.workspaceID = featureFlag.workspaceID;
    this.deleted = featureFlag.deleted;
  }

  static of(featureFlag: FeatureFlagProps) {
    return new FeatureFlag(featureFlag);
  }
}
