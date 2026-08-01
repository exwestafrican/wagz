import { Module } from '@nestjs/common';
import { TrackerService } from '@/tracker/tracker.service';
import { TrackerController } from '@/tracker/tracker.controller';
import { TrackerAdminController } from '@/tracker/admin/tracker-admin.controller';
import { PermissionModule } from '@/permission/permission.module';

@Module({
  imports: [PermissionModule],
  providers: [TrackerService],
  controllers: [TrackerController, TrackerAdminController],
  exports: [TrackerService],
})
export class TrackerModule {}
