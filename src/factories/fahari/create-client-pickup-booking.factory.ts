import { Factory } from 'fishery';
import { CreateClientPickupBookingDto } from '@/fahari/booking/dto/create-client-pickup-booking.dto';

const createClientPickupBookingFactory =
  Factory.define<CreateClientPickupBookingDto>(({ sequence }) => {
    return {
      userId: sequence,
      date: '2026-09-16',
      startTime: '08:30',
      firstName: 'Amara',
      lastName: 'Okafor',
      pickupLocation: 'JKIA Terminal 1, Nairobi',
      locationUrl: 'https://maps.google.com/?q=JKIA',
      note: 'Client asked for a child seat',
    };
  });

export default createClientPickupBookingFactory;
