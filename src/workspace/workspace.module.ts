import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';

@Module({
  providers: [WorkspaceManager],
})
export class WorkspaceModule {}
