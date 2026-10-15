import { Module } from '@nestjs/common';
import { BookingService } from '@/fahari/booking/booking.service';
import { BookingAdminController } from '@/fahari/booking/admin/booking-admin.controller';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { BookingController } from '@/fahari/booking/booking.controller';

@Module({
  imports: [FahariPermissionModule],
  providers: [BookingService],
  controllers: [BookingAdminController, BookingController],
  exports: [BookingService],
})
export class BookingModule {}
