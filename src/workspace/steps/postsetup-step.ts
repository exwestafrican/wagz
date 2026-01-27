import { WorkspaceDetails } from '@/workspace/domain/workspace-details';

export interface PostSetupStep {
  execute(workspaceDetails: WorkspaceDetails): Promise<void>;
  compensate(workspaceDetails: WorkspaceDetails): Promise<void>;
}
