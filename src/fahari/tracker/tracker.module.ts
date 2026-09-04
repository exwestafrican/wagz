import { Module } from '@nestjs/common';
import { TrackerService } from '@/fahari/tracker/tracker.service';
import { TrackerController } from '@/fahari/tracker/tracker.controller';
import { TrackerAdminController } from '@/fahari/tracker/admin/tracker-admin.controller';
import { PermissionModule } from '@/permission/permission.module';
import { DeviceAuthGuard } from '@/fahari/auth/guard/device-auth.guard';
import { GeoFencingService } from '@/fahari/tracker/geo-fencing.service';

@Module({
  imports: [PermissionModule],
  providers: [TrackerService, DeviceAuthGuard, GeoFencingService],
  controllers: [TrackerController, TrackerAdminController],
  exports: [TrackerService, GeoFencingService],
})
export class TrackerModule {}
