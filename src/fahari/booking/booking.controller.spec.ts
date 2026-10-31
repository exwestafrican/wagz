import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { QueuedJobStatus, RideRequestState } from '@/generated/prisma/enums';
import { BookingController } from '@/fahari/booking/booking.controller';
import { RideRequestService } from '@/fahari/booking/ride-request.service';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import { CreateRideRequestDto } from '@/fahari/booking/dto/create-ride-request.dto';
import Queue from '@/scheduler/queue';
import TaskQueue from '@/scheduler/tasks';

function araIyeRoundTrip(
  overrides: Partial<CreateRideRequestDto> = {},
): CreateRideRequestDto {
  return plainToInstance(CreateRideRequestDto, {
    experienceCode: 'araiye',
    numberOfPassengers: 1,
    pickupLocation: '12 Admiralty Way, Lekki',
    nearestLandmark: 'Opposite Shoprite',
    pickupDateTime: new Date('2026-10-21T14:00:00.000Z'),
    departureDateTime: new Date('2026-10-22T10:00:00.000Z'),
    firstName: 'Amara',
    lastName: 'Okafor',
    email: 'guest@example.com',
    phoneNumber: {
      countryCallingCode: '+234',
      nationalNumber: '8031234567',
    },
    ...overrides,
  });
}

describe('BookingController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let bookingController: BookingController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    const resortLineItemPricer = new ResortLineItemPricer();
    bookingController = new BookingController(
      resortLineItemPricer,
      new RideRequestService(
        prismaService,
        resortLineItemPricer,
        new Queue(prismaService),
      ),
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('getListing', () => {
    it('returns prices in naira', () => {
      expect(bookingController.getListing({ code: 'araiye' })).toMatchObject({
        pricePerNight: '150000.00',
        currency: 'NGN',
        billing: {
          accommodation: {
            basePrice: '150000.00',
            additionalNightPrice: '50000.00',
          },
        },
        rideProviders: [
          {
            sameDayReturnPrice: '69660.00',
            multipleDaysReturnPrice: '88245.00',
          },
        ],
      });
    });
  });

  describe('calculateBilling', () => {
    it('returns the quote in naira', () => {
      expect(
        bookingController.calculateBilling({
          resortCode: 'araiye',
          numberOfNights: 2,
          lineItem: 'ride',
          numberOfGuests: 3,
        }),
      ).toEqual({ amount: '88245.00' });
    });
  });

  describe('createRideRequest', () => {
    it('stores a pending ride request in kobo and returns the quote in naira', async () => {
      const rideRequest =
        await bookingController.createRideRequest(araIyeRoundTrip());

      expect(rideRequest).toMatchObject({
        state: RideRequestState.PENDING,
        amount: '88245.00',
        currency: 'NGN',
        experienceCode: 'araiye',
        numberOfPassengers: 1,
      });
      expect(rideRequest).not.toHaveProperty('minorAmount');
      expect(rideRequest).not.toHaveProperty('email');
      expect(rideRequest).not.toHaveProperty('phoneNumber');

      expect(
        await prismaService.rideRequest.findFirst({
          where: { id: rideRequest.id },
        }),
      ).toMatchObject({
        minorAmount: 8_824_500,
        state: RideRequestState.PENDING,
        nearestLandmark: 'Opposite Shoprite',
        countryCallingCode: '+234',
        nationalNumber: '8031234567',
      });
      expect(await prismaService.booking.count()).toBe(0);

      const queuedRideRequestJob = await prismaService.queuedJob.findFirst({
        where: { taskName: TaskQueue.NEW_RIDE_REQUEST },
      });
      expect(queuedRideRequestJob).toMatchObject({
        taskName: TaskQueue.NEW_RIDE_REQUEST,
        status: QueuedJobStatus.PENDING,
        params: {
          rideRequestId: rideRequest.id,
          experienceCode: 'araiye',
        },
      });
    });

    it('stores a ride request without a nearest landmark', async () => {
      const rideRequest = await bookingController.createRideRequest(
        araIyeRoundTrip({ nearestLandmark: undefined }),
      );

      expect(
        await prismaService.rideRequest.findFirst({
          where: { id: rideRequest.id },
        }),
      ).toMatchObject({ nearestLandmark: null });
    });

    it('throws NotFoundException when the experience does not exist', async () => {
      await expect(
        bookingController.createRideRequest(
          araIyeRoundTrip({ experienceCode: 'missing-resort' }),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(await prismaService.rideRequest.count()).toBe(0);
      expect(await prismaService.booking.count()).toBe(0);
    });

    it('throws BadRequestException when departure is not after pickup', async () => {
      await expect(
        bookingController.createRideRequest(
          araIyeRoundTrip({
            pickupDateTime: new Date('2026-10-22T10:00:00.000Z'),
            departureDateTime: new Date('2026-10-21T14:00:00.000Z'),
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(await prismaService.rideRequest.count()).toBe(0);
    });

    it('throws BadRequestException when no vehicle can carry the passengers', async () => {
      await expect(
        bookingController.createRideRequest(
          araIyeRoundTrip({ numberOfPassengers: 4 }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(await prismaService.rideRequest.count()).toBe(0);
      expect(await prismaService.booking.count()).toBe(0);
    });

    it('rejects an invalid phone number', async () => {
      const rideRequest = araIyeRoundTrip({
        phoneNumber: {
          countryCallingCode: '+234',
          nationalNumber: '816908776',
        },
      });

      const errors = await validate(rideRequest);

      expect(errors.map((error) => error.property)).toContain('phoneNumber');
    });
  });
});
