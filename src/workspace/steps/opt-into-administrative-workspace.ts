import { Logger } from '@nestjs/common';
import { FEATURE_ADMINISTRATIVE_WORKSPACE_KEY } from '@/feature-flag/const';
import FeatureFlagManager from '@/feature-flag/manager';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';

export class OptIntoAdministrativeWorkspaceStep implements PostSetupStep {
  logger = new Logger(OptIntoAdministrativeWorkspaceStep.name);

  constructor(private readonly featureFlagManager: FeatureFlagManager) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    await this.featureFlagManager.turnOnFF(
      workspaceDetails.code,
      FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
    );
    this.logger.log(
      `Opted workspace into administrative workspace feature; workspaceCode=${workspaceDetails.code} workspaceId=${workspaceDetails.workspaceId}`,
    );
  }

  async compensate(workspaceDetails: WorkspaceDetails): Promise<void> {
    await this.featureFlagManager.turnOff(
      workspaceDetails.code,
      FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
    );
    this.logger.warn(
      `Removing administrative workspace feature opt-in as compensating action; workspaceCode=${workspaceDetails.code} workspaceId=${workspaceDetails.workspaceId}`,
    );
  }
}
