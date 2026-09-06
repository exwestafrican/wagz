import { Factory } from 'fishery';
import { Booking, ClientPickupDetail } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateClientPickupBookingDto } from '@/fahari/booking/dto/create-client-pickup-booking.dto';
import {
  hoursMinutesFromTimeOfDay,
  isoDateFromCalendarDate,
} from '@/fahari/booking/utils/booking-datetime';

const clientPickupDetailFactory = Factory.define<ClientPickupDetail>(
  ({ sequence }) => {
    return {
      id: sequence,
      bookingId: sequence,
      firstName: 'Amara',
      lastName: 'Okafor',
      pickupLocation: 'JKIA Terminal 1, Nairobi',
      locationUrl: 'https://maps.google.com/?q=JKIA',
    };
  },
);

export async function persistClientPickupDetail(
  prismaService: PrismaService,
  clientPickupDetail: ClientPickupDetail,
) {
  await prismaService.clientPickupDetail.create({ data: clientPickupDetail });
}

export function toCreateClientPickupBookingDto(
  booking: Booking,
  clientPickupDetail: ClientPickupDetail,
): CreateClientPickupBookingDto {
  return {
    userId: booking.userId,
    date: isoDateFromCalendarDate(booking.date),
    startTime: hoursMinutesFromTimeOfDay(booking.startTime),
    firstName: clientPickupDetail.firstName,
    lastName: clientPickupDetail.lastName ?? undefined,
    pickupLocation: clientPickupDetail.pickupLocation,
    locationUrl: clientPickupDetail.locationUrl,
    note: booking.note ?? undefined,
  };
}

export default clientPickupDetailFactory;
