import { Injectable, NotFoundException } from '@nestjs/common';
import { Experience, getExperienceOrThrow } from '@/fahari/booking/config';

export const LINE_ITEMS = ['accommodation', 'ride'] as const;
export type LineItem = (typeof LINE_ITEMS)[number];

@Injectable()
export class ResortLineItemPricer {
  total(
    resortCode: string,
    numberOfNights: number,
    lineItem: LineItem,
    numberOfGuests: number,
  ) {
    const experience = getExperienceOrThrow(resortCode); //TODO: make this get resort experience
    switch (lineItem) {
      case 'accommodation':
        return this.calculateAccommodation(experience, numberOfNights);
      case 'ride':
        return this.calculateVehicleBooking(
          experience,
          numberOfNights,
          numberOfGuests,
        );
      default:
        throw new NotFoundException('Invalid line item');
    }
  }

  private calculateAccommodation(
    experience: Experience,
    numberOfNights: number,
  ) {
    const basePrice = experience.billing.accommodation.basePrice;
    if (numberOfNights == 0) return 0;
    if (numberOfNights === 1) {
      return basePrice;
    }

    return (
      basePrice +
      numberOfNights * experience.billing.accommodation.additionalNightPrice
    );
  }

  private calculateVehicleBooking(
    experience: Experience,
    numberOfNights: number,
    numberOfGuests: number,
  ) {
    const policy = this.getPolicyOrThrow(experience, numberOfGuests);

    if (numberOfNights == 0) return policy.sameDayReturnPrice;
    if (numberOfNights === 1) {
      return policy.sameDayReturnPrice;
    }
    return policy.multipleDaysReturnPrice;
  }

  private getPolicyOrThrow(experience: Experience, numberOfGuests: number) {
    const provider = experience.rideProviders.find(
      (rideProvider) => numberOfGuests <= rideProvider.maximumCapacity,
    );
    if (provider) {
      return provider;
    }
    throw new NotFoundException('cannot find vehicle provider with capacity');
  }
}
