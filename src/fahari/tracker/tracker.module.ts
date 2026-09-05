import { Module } from '@nestjs/common';
import { TrackerService } from '@/fahari/tracker/tracker.service';
import { TrackerController } from '@/fahari/tracker/tracker.controller';
import { TrackerAdminController } from '@/fahari/tracker/admin/tracker-admin.controller';
import { PermissionModule } from '@/permission/permission.module';
import { DeviceAuthGuard } from '@/fahari/auth/guard/device-auth.guard';
import GeofenceService from '@/fahari/tracker/geofence.service';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [PermissionModule, CommonModule],
  providers: [TrackerService, DeviceAuthGuard, GeofenceService],
  controllers: [TrackerController, TrackerAdminController],
  exports: [TrackerService],
})
export class TrackerModule {}
