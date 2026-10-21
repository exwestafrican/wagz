import { NotFoundException } from '@nestjs/common';
import { formatNaira } from '@/fahari/booking/money';

type Schedule = {
  startTime: string;
  endTime: string;
};

type BookingPolicy = {
  maximumNights: number;
  minAdvanceBookingDays: number;
  maxAdvanceBookingDays: number;
};

type MeetingPoint = {
  name: string;
};

type DurationBasedPricing = {
  durationUnit: 'nights' | 'days' | 'hours';
  basePrice: string;
  additionalNightPrice: string;
};

type ResortBilling = {
  accommodation: DurationBasedPricing;
};

export type ProviderPolicy = {
  provider: string;
  maximumCapacity: number;
  sameDayReturnPrice: string;
  multipleDaysReturnPrice: string;
};

export type Experience = {
  name: string;
  tagLine: string;
  code: string;
  pricePerNight: string;
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
    pricePerNight: formatNaira(150_000),
    currency: 'NGN',
    category: 'resort',
    onlyRideBooking: true,
    bookingPolicy: {
      maximumNights: 1,
      minAdvanceBookingDays: 5,
      maxAdvanceBookingDays: 40,
    },
    schedule: {
      startTime: '15:00',
      endTime: '11:00',
    },
    billing: {
      accommodation: {
        durationUnit: 'nights',
        basePrice: formatNaira(150_000),
        additionalNightPrice: formatNaira(50_000),
      },
    },
    meetingPoint: {
      name: 'ara iye reception',
    },
    rideProviders: [
      {
        provider: 'fahari',
        maximumCapacity: 3,
        sameDayReturnPrice: formatNaira(69_660),
        multipleDaysReturnPrice: formatNaira(88_245),
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
