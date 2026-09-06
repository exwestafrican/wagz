import { Factory } from 'fishery';
import { Booking } from '@/generated/prisma/client';
import { BookingState, BookingType } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFleetBookingDto } from '@/fahari/booking/dto/create-fleet-booking.dto';

class BookingFactory extends Factory<Booking> {
  fleet(booking?: Partial<Booking>) {
    return this.build({ type: BookingType.FLEET, ...booking });
  }

  clientPickup(booking?: Partial<Booking>) {
    return this.build({
      type: BookingType.CLIENT,
      endDateTime: null,
      startDateTime: new Date('2026-09-16T08:30:00.000Z'),
      note: 'Client asked for a child seat',
      ...booking,
    });
  }
}

const bookingFactory = BookingFactory.define(({ sequence }) => {
  return {
    id: sequence,
    userId: sequence,
    startDateTime: new Date('2026-09-15T09:00:00.000Z'),
    endDateTime: new Date('2026-09-15T17:00:00.000Z'),
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
  if (booking.endDateTime == null) {
    throw new Error('fleet booking requires an endDateTime');
  }

  return {
    userId: booking.userId,
    startDateTime: booking.startDateTime,
    endDateTime: booking.endDateTime,
    note: booking.note ?? undefined,
  };
}

export default bookingFactory;
