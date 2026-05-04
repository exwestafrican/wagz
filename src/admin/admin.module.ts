import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { FeatureFlagModule } from '@/feature-flag/feature-flag.module';
import { PermissionModule } from '@/permission/permission.module';

@Module({
  imports: [FeatureFlagModule, PermissionModule],
  controllers: [AdminController],
})
export class AdminModule {}
