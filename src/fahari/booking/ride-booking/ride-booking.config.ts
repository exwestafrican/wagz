import { formatNaira } from '@/fahari/booking/money';

const TripType = {
  ONE_WAY: {
    code: 'one_way',
    description:
      'take client from home to meetup location or meet up location home only.',
  },
  ROUND_TRIP: {
    code: 'round_trip',
    description: 'pick up and go back for drop off',
  },
};

type TripType = (typeof TripType)[keyof typeof TripType];

type MeetupPoint = {
  name: string;
  address: string;
  nearestLandmark: string | null;
};
type ChauffeurBookingPolicy = {
  maxDaysAfterPickup: number;
  minDaysBeforeTrip: number;
  maxDaysBeforeTrip: number;
};
type ChauffeurVehicle = {
  operator: string;
  name: string;
  maximumPassengers: number;
  sameDayPrice: string;
  multiDayPrice: string;
};

export type ChauffeurClient = {
  name: string;
  code: string;
  tagLine: string;
  tripType: TripType;
  fareNote: string | null;
  notificationEmail: string;
  meetupPoint: MeetupPoint;
  bookingPolicy: ChauffeurBookingPolicy;
  vehicles: ChauffeurVehicle[];
};

function defaultBookingPolicy(maxDaysAfterPickup: number) {
  return {
    maxDaysAfterPickup: maxDaysAfterPickup, // if i book a pickup today, and it's a return how may days in advance can i select my return trip.
    minDaysBeforeTrip: 5,
    maxDaysBeforeTrip: 40,
  };
}

function toyotaCamryByFahari(sameDayPrice: number, multiDayPrice: number) {
  return {
    operator: 'fahari',
    name: 'Toyota Camry',
    maximumPassengers: 3,
    sameDayPrice: formatNaira(sameDayPrice),
    multiDayPrice: formatNaira(multiDayPrice),
  };
}

const chauffeurClients: ChauffeurClient[] = [
  {
    name: 'ara iye',
    code: 'araiye',
    tagLine: 'Reconnection with nature, culture, and silliness.',
    tripType: TripType.ROUND_TRIP,
    fareNote:
      'Your car includes pickup to the resort and the return ride. The total covers both journeys',
    notificationEmail: 'humans@fahari.io',
    meetupPoint: {
      name: 'ara iye',
      address: 'owode ogun state',
      nearestLandmark: null,
    },
    bookingPolicy: defaultBookingPolicy(1),
    vehicles: [toyotaCamryByFahari(69_660, 88_245)],
  },
  {
    name: 'soft days by Ade x Ede',
    code: 'softdays',
    tagLine: 'Slow travel for creatives in africa',
    tripType: TripType.ONE_WAY,
    fareNote: null,
    notificationEmail: 'humans@fahari.io',
    meetupPoint: {
      name: 'seme border',
      address: 'lagos badagry express way',
      nearestLandmark: null,
    },
    bookingPolicy: defaultBookingPolicy(0),
    vehicles: [toyotaCamryByFahari(75_000, 150_000)],
  },
];

export default chauffeurClients;
