import { BadRequestException } from '@nestjs/common';
import { differenceInCalendarDays } from 'date-fns';
import { ChauffeurClient } from '@/fahari/booking/ride-booking/ride-booking.config';
import { toKobo } from '@/fahari/booking/money';

export default class ChauffeurFare {
  amount(client: ChauffeurClient, pickupDateTime: Date, returnDateTime?: Date) {
    //TODO: later we can take in car-code or dynamically figure out the car
    const defaultVehicle = client.vehicles.at(0);
    if (!defaultVehicle) throw Error('No vehicles available');

    if (!returnDateTime) {
      return toKobo(defaultVehicle.sameDayPrice);
    }

    const daysUntilReturn = differenceInCalendarDays(
      returnDateTime,
      pickupDateTime,
    );
    if (daysUntilReturn < 0) {
      throw new BadRequestException('return must be on or after pickup');
    }
    if (daysUntilReturn === 0) {
      return toKobo(defaultVehicle.sameDayPrice);
    }
    return toKobo(defaultVehicle.multiDayPrice);
  }
}
