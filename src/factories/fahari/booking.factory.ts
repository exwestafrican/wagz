import { Factory } from 'fishery';
import { Booking } from '@/generated/prisma/client';
import { BookingState, BookingType } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFleetBookingDto } from '@/fahari/booking/dto/create-fleet-booking.dto';
import {
  calendarDateFromIsoDate,
  hoursMinutesFromTimeOfDay,
  isoDateFromCalendarDate,
  timeOfDayFromHoursMinutes,
} from '@/fahari/booking/utils/booking-datetime';

class BookingFactory extends Factory<Booking> {
  fleet(booking?: Partial<Booking>) {
    return this.build({ type: BookingType.FLEET, ...booking });
  }

  clientPickup(booking?: Partial<Booking>) {
    return this.build({
      type: BookingType.CLIENT,
      endTime: null,
      date: calendarDateFromIsoDate('2026-09-16'),
      startTime: timeOfDayFromHoursMinutes('08:30'),
      note: 'Client asked for a child seat',
      ...booking,
    });
  }
}

const bookingFactory = BookingFactory.define(({ sequence }) => {
  return {
    id: sequence,
    userId: sequence,
    date: calendarDateFromIsoDate('2026-09-15'),
    startTime: timeOfDayFromHoursMinutes('09:00'),
    endTime: timeOfDayFromHoursMinutes('17:00'),
    state: BookingState.PENDING,
    reason: null,
    type: BookingType.FLEET,
    note: 'Airport run after the board meeting',
    confirmedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});

export async function persistBooking(
  prismaService: PrismaService,
  booking: Booking,
) {
  await prismaService.booking.create({ data: booking });
}

export function toCreateFleetBookingDto(
  booking: Booking,
): CreateFleetBookingDto {
  if (booking.endTime == null) {
    throw new Error('fleet booking requires an endTime');
  }

  return {
    userId: booking.userId,
    date: isoDateFromCalendarDate(booking.date),
    startTime: hoursMinutesFromTimeOfDay(booking.startTime),
    endTime: hoursMinutesFromTimeOfDay(booking.endTime),
    note: booking.note ?? undefined,
  };
}

export default bookingFactory;
