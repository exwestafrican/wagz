import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';

@Module({
  providers: [WorkspaceManager],
  controllers: [WorkspaceController],
})
export class WorkspaceModule {}
