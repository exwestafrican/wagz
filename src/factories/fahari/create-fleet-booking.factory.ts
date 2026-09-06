import { Factory } from 'fishery';
import { CreateFleetBookingDto } from '@/fahari/booking/dto/create-fleet-booking.dto';

const createFleetBookingFactory = Factory.define<CreateFleetBookingDto>(
  ({ sequence }) => {
    return {
      userId: sequence,
      date: '2026-09-15',
      startTime: '09:00',
      endTime: '17:00',
      note: 'Airport run after the board meeting',
    };
  },
);

export default createFleetBookingFactory;
