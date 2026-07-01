import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FeatureFlagModule } from '@/feature-flag/feature-flag.module';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { ImpersonationModule } from '@/impersonation/impersonation.module';

@Module({
  imports: [FeatureFlagModule, PermissionModule, WorkspaceModule, ImpersonationModule],
  controllers: [AdminController],
})
export class AdminModule {}
