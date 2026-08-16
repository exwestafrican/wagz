import { Module } from '@nestjs/common';
import { TrackerService } from '@/fahari/tracker/tracker.service';
import { TrackerController } from '@/fahari/tracker/tracker.controller';
import { TrackerAdminController } from '@/fahari/tracker/admin/tracker-admin.controller';
import { PermissionModule } from '@/common/permission/permission.module';
import { DeviceAuthGuard } from '@/fahari/auth/guard/device-auth.guard';

@Module({
  imports: [PermissionModule],
  providers: [TrackerService, DeviceAuthGuard],
  controllers: [TrackerController, TrackerAdminController],
  exports: [TrackerService],
})
export class TrackerModule {}
