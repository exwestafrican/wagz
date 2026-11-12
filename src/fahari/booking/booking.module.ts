import { Module } from '@nestjs/common';
import { BookingService } from '@/fahari/booking/booking.service';
import { BookingAdminController } from '@/fahari/booking/admin/booking-admin.controller';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { BookingController } from '@/fahari/booking/booking.controller';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import { RideRequestService } from '@/fahari/booking/ride-request.service';
import { FahariNotificationModule } from '@/fahari/notification/notification.module';
import SchedulerModule from '@/scheduler/scheduler.module';

@Module({
  imports: [FahariPermissionModule, FahariNotificationModule, SchedulerModule],
  providers: [BookingService, ResortLineItemPricer, RideRequestService],
  controllers: [BookingAdminController, BookingController],
  exports: [BookingService],
})
export class BookingModule {}
