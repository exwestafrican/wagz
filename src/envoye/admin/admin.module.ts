import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FeatureFlagModule } from '@/envoye/feature-flag/feature-flag.module';
import { PermissionModule } from '@/common/permission/permission.module';
import { WorkspaceModule } from '@/envoye/workspace/workspace.module';

@Module({
  imports: [FeatureFlagModule, PermissionModule, WorkspaceModule],
  controllers: [AdminController],
})
export class AdminModule {}
