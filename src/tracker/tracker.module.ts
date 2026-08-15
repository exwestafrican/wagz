import { Module } from '@nestjs/common';
import { TrackerService } from '@/tracker/tracker.service';
import { TrackerController } from '@/tracker/tracker.controller';
import { TrackerAdminController } from '@/tracker/admin/tracker-admin.controller';
import { PermissionModule } from '@/permission/permission.module';
import { DeviceAuthGuard } from '@/tracker/guard/device-auth.guard';

@Module({
  imports: [PermissionModule],
  providers: [TrackerService, DeviceAuthGuard],
  controllers: [TrackerController, TrackerAdminController],
  exports: [TrackerService],
})
export class TrackerModule {}
