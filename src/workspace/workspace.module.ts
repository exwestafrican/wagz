import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';

@Module({
  imports: [PermissionModule, PermissionModule],
  providers: [WorkspaceManager, WorkspaceLinkService, WorkspaceInviteService],
  controllers: [WorkspaceController],
  exports: [WorkspaceManager, WorkspaceLinkService, WorkspaceInviteService],
})
export class WorkspaceModule {}
