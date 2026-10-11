import { NotFoundException } from '@nestjs/common';

type Schedule = {
  startTime: string;
  endTime: string;
};

type BookingPolicy = {
  maximumNights: number;
  maxAdvanceBookingDays: number;
};

type MeetingPoint = {
  name: string;
};

type DurationBasedPricing = {
  durationUnit: 'nights' | 'days' | 'hours';
  basePrice: number;
  additionalNightPrice: number;
};

type ResortBilling = {
  accommodation: DurationBasedPricing;
};

export type ProviderPolicy = {
  provider: string;
  maximumCapacity: number;
  sameDayReturnPrice: number;
  multipleDaysReturnPrice: number;
};

export type Experience = {
  name: string;
  tagLine: string;
  code: string;
  pricePerNight: number;
  currency: string;
  category: string;
  bookingPolicy: BookingPolicy;
  schedule: Schedule;
  billing: ResortBilling;
  meetingPoint: MeetingPoint;
  onlyRideBooking: boolean;
  rideProviders: ProviderPolicy[];
};

//TODO: find a way to cache this
const experiences: Experience[] = [
  {
    name: 'ara iye',
    tagLine: 'Reconnection with nature, culture, and silliness.',
    code: 'araiye',
    pricePerNight: 150000,
    currency: 'NGN',
    category: 'resort',
    onlyRideBooking: false,
    bookingPolicy: {
      maximumNights: 2,
      maxAdvanceBookingDays: 40,
    },
    schedule: {
      startTime: '15:00',
      endTime: '11:00',
    },
    billing: {
      accommodation: {
        durationUnit: 'nights',
        basePrice: 150_000,
        additionalNightPrice: 50_000,
      },
    },
    meetingPoint: {
      name: 'ara iye reception',
    },
    rideProviders: [
      {
        provider: 'fahari',
        maximumCapacity: 3,
        sameDayReturnPrice: 69_660,
        multipleDaysReturnPrice: 88_245,
      },
    ],
  },
];

export function getExperiences() {
  return experiences;
}

export function getExperienceOrThrow(code: string): Experience {
  const experience = getExperience(code);
  if (!experience) {
    throw new NotFoundException(`Experience ${code} not found`);
  }
  return experience;
}

export function getExperience(code: string): Experience | undefined {
  return getExperiences().find((x) => x.code === code);
}

export function billingCodes(code: string) {
  const experience = getExperience(code);
  if (experience) {
    return Object.keys(experience.billing);
  }
  return [];
}
