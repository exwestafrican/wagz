import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { RoleService } from '@/permission/role/role.service';

@Module({
  providers: [WorkspaceManager, WorkspaceLinkService, RoleService],
  controllers: [WorkspaceController],
})
export class WorkspaceModule {}
