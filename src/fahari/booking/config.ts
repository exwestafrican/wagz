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

export type ListingRide = {
  provider: string;
  oneWayTrip: number;
  returnTrip: number;
  maximumCapacity: number;
};

export type AdditionalServices = {
  rides: ListingRide[];
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
  meetingPoint: MeetingPoint;
  onlyRideBooking: boolean;
  additionalServices: AdditionalServices;
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
    meetingPoint: {
      name: 'ara iye reception',
    },
    additionalServices: {
      rides: [
        {
          provider: 'Fahari',
          oneWayTrip: 100000,
          returnTrip: 120000,
          maximumCapacity: 3,
        },
      ],
    },
  },
];

export function getExperiences() {
  return experiences;
}

export function getExperience(code: string) {
  return getExperiences().find((x) => x.code === code);
}
