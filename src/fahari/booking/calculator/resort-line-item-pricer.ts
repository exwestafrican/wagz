import { Injectable, NotFoundException } from '@nestjs/common';
import { Experience, getExperienceOrThrow } from '@/fahari/booking/config';
import { toKobo } from '@/fahari/booking/money';

export const LINE_ITEMS = ['accommodation', 'ride'] as const;
export type LineItem = (typeof LINE_ITEMS)[number];

@Injectable()
export class ResortLineItemPricer {
  total(
    resortCode: string,
    numberOfNights: number,
    lineItem: LineItem,
    numberOfGuests: number,
  ): number {
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
    const basePrice = toKobo(experience.billing.accommodation.basePrice);
    if (numberOfNights === 0) {
      return basePrice;
    }

    const additionalNights =
      numberOfNights *
      toKobo(experience.billing.accommodation.additionalNightPrice);
    return basePrice + additionalNights;
  }

  private calculateVehicleBooking(
    experience: Experience,
    numberOfNights: number,
    numberOfGuests: number,
  ) {
    const policy = this.getPolicyOrThrow(experience, numberOfGuests);
    const returnPrice =
      numberOfNights == 0
        ? policy.sameDayReturnPrice
        : policy.multipleDaysReturnPrice;
    return toKobo(returnPrice);
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
