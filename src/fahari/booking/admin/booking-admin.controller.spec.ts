import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import RequestUser from '@/auth/domain/request-user';
import { BookingService } from '@/fahari/booking/booking.service';
import { BookingAdminController } from '@/fahari/booking/admin/booking-admin.controller';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { BookingState, BookingType } from '@/generated/prisma/enums';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';
import createFleetBookingFactory from '@/factories/fahari/create-fleet-booking.factory';
import createClientPickupBookingFactory from '@/factories/fahari/create-client-pickup-booking.factory';

describe('BookingAdminController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let adminController: BookingAdminController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    adminController = new BookingAdminController(
      new BookingService(prismaService),
      new FahariPermissionService(prismaService),
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createFleetBooking', () => {
    it('creates a pending fleet booking and initial assignment for a super admin', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );
      const adeola = await factory.persist('user', () => userFactory.build());
      const requestUser = RequestUser.of(tumise.email);

      const createdBooking = await adminController.createFleetBooking(
        requestUser,
        createFleetBookingFactory.build({ userId: adeola.id }),
      );

      expect(createdBooking.type).toBe(BookingType.FLEET);
      expect(createdBooking.state).toBe(BookingState.PENDING);
      expect(createdBooking.userId).toBe(adeola.id);
      expect(createdBooking.note).toBe('Airport run after the board meeting');
      expect(createdBooking.clientPickupDetail).toBeNull();
      expect(createdBooking.assignments).toHaveLength(1);
      expect(createdBooking.assignments[0].userId).toBe(adeola.id);

      const persistedBooking = await prismaService.booking.findUniqueOrThrow({
        where: { id: createdBooking.id },
        include: { assignments: true, clientPickupDetail: true },
      });
      expect(persistedBooking.type).toBe(BookingType.FLEET);
      expect(persistedBooking.assignments).toHaveLength(1);
      expect(persistedBooking.assignments[0].userId).toBe(adeola.id);
      expect(persistedBooking.clientPickupDetail).toBeNull();
    });

    it('throws ForbiddenException when the caller is not a super admin', async () => {
      const kemi = await factory.persist('user', () => userFactory.build());
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(kemi.email),
          createFleetBookingFactory.build({ userId: adeola.id }),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(await prismaService.booking.count()).toBe(0);
    });

    it('throws ForbiddenException when the caller does not exist', async () => {
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(faker.internet.email().toLowerCase()),
          createFleetBookingFactory.build({ userId: adeola.id }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the chauffeur does not exist', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(tumise.email),
          createFleetBookingFactory.build({ userId: 999_999 }),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(await prismaService.booking.count()).toBe(0);
    });
  });

  describe('createClientPickupBooking', () => {
    it('creates a pending client pickup booking with assignment and pickup details', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );
      const adeola = await factory.persist('user', () => userFactory.build());
      const requestUser = RequestUser.of(tumise.email);

      const createdBooking = await adminController.createClientPickupBooking(
        requestUser,
        createClientPickupBookingFactory.build({ userId: adeola.id }),
      );

      expect(createdBooking.type).toBe(BookingType.CLIENT);
      expect(createdBooking.state).toBe(BookingState.PENDING);
      expect(createdBooking.userId).toBe(adeola.id);
      expect(createdBooking.assignments).toHaveLength(1);
      expect(createdBooking.assignments[0].userId).toBe(adeola.id);
      expect(createdBooking.clientPickupDetail).toMatchObject({
        firstName: 'Amara',
        lastName: 'Okafor',
        pickupLocation: 'JKIA Terminal 1, Nairobi',
        locationUrl: 'https://maps.google.com/?q=JKIA',
      });

      const persistedBooking = await prismaService.booking.findUniqueOrThrow({
        where: { id: createdBooking.id },
        include: { assignments: true, clientPickupDetail: true },
      });
      expect(persistedBooking.assignments).toHaveLength(1);
      expect(persistedBooking.clientPickupDetail).toMatchObject({
        firstName: 'Amara',
        lastName: 'Okafor',
        pickupLocation: 'JKIA Terminal 1, Nairobi',
        locationUrl: 'https://maps.google.com/?q=JKIA',
      });
    });

    it('throws ForbiddenException when the caller is not a super admin', async () => {
      const kemi = await factory.persist('user', () => userFactory.build());
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createClientPickupBooking(
          RequestUser.of(kemi.email),
          createClientPickupBookingFactory.build({ userId: adeola.id }),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(await prismaService.booking.count()).toBe(0);
    });

    it('throws NotFoundException when the chauffeur does not exist', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );

      await expect(
        adminController.createClientPickupBooking(
          RequestUser.of(tumise.email),
          createClientPickupBookingFactory.build({ userId: 999_999 }),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
