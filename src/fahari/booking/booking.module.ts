import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BookingService } from '@/fahari/booking/booking.service';
import { BookingAdminController } from '@/fahari/booking/admin/booking-admin.controller';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { BookingController } from '@/fahari/booking/booking.controller';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import { RideRequestService } from '@/fahari/booking/ride-request.service';
import { FahariNotificationModule } from '@/fahari/notification/notification.module';
import SchedulerModule from '@/scheduler/scheduler.module';
import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import { UnavailablePlacesClient } from '@/fahari/booking/places/unavailable-places.client';

const GooglePlacesClientProvider = {
  provide: GooglePlacesClient,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const apiKey = configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (apiKey) {
      return new GooglePlacesClient(apiKey);
    }
    return new UnavailablePlacesClient();
  },
};

@Module({
  imports: [
    FahariPermissionModule,
    FahariNotificationModule,
    SchedulerModule,
    // Limits are set per route with @Throttle; this default only applies where ThrottlerGuard is used.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
  ],
  providers: [
    BookingService,
    ResortLineItemPricer,
    RideRequestService,
    ChauffeurFare,
    GooglePlacesClientProvider,
  ],
  controllers: [BookingAdminController, BookingController],
  exports: [BookingService],
})
export class BookingModule {}
