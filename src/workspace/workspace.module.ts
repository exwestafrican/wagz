import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { PermissionModule } from '@/permission/permission.module';

@Module({
  imports: [PermissionModule, PermissionModule],
  providers: [WorkspaceManager, WorkspaceLinkService],
  controllers: [WorkspaceController],
  exports: [WorkspaceManager, WorkspaceLinkService],
})
export class WorkspaceModule {}
