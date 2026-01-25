import { WorkspaceDetails } from '@/workspace/domain/WorkspaceDetails';

export interface PostSetupStep {
  execute(workspaceDetails: WorkspaceDetails): Promise<void>;
  compensate(workspaceDetails: WorkspaceDetails): Promise<void>;
}
