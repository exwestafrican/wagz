import { ChauffeurClient } from '@/fahari/booking/ride-booking/ride-booking.config';
import { toKobo } from '@/fahari/booking/money';

export default class ChauffeurFare {
  amount(client: ChauffeurClient, returnDateTime: Date | null) {
    //TODO: later we can take in car-code or dynamically figure out the car
    const defaultVehicle = client.vehicles.at(0);
    if (!defaultVehicle) throw Error('No vehicles available');

    if (returnDateTime) {
      return toKobo(defaultVehicle.multiDayPrice);
    } else {
      return toKobo(defaultVehicle.sameDayPrice);
    }
  }
}
