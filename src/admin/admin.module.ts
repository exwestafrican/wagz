import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FeatureFlagModule } from '@/feature-flag/feature-flag.module';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceModule } from '@/workspace/workspace.module';

@Module({
  imports: [FeatureFlagModule, PermissionModule, WorkspaceModule],
  controllers: [AdminController],
})
export class AdminModule {}
