import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';

@Module({
  providers: [WorkspaceManager, WorkspaceLinkService],
  controllers: [WorkspaceController],
})
export class WorkspaceModule {}
