import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  BadRequestException,
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
import { BookingType } from '@/generated/prisma/enums';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';
import bookingFactory, {
  toCreateFleetBookingDto,
} from '@/factories/fahari/booking.factory';
import clientPickupDetailFactory, {
  toCreateClientPickupBookingDto,
} from '@/factories/fahari/client-pickup-detail.factory';

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
    it('creates a fleet booking and assignment for the chauffeur', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );
      const adeola = await factory.persist('user', () => userFactory.build());

      await adminController.createFleetBooking(
        RequestUser.of(tumise.email),
        toCreateFleetBookingDto(bookingFactory.fleet({ userId: adeola.id })),
      );

      expect(
        await prismaService.booking.findFirst({
          where: { userId: adeola.id, type: BookingType.FLEET },
        }),
      ).not.toBeNull();
      expect(
        await prismaService.bookingAssignment.findFirst({
          where: { userId: adeola.id, assignedById: tumise.id },
        }),
      ).not.toBeNull();
    });

    it('throws BadRequestException when start and end are on different UTC days', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );
      const adeola = await factory.persist('user', () => userFactory.build());
      const fleetBooking = toCreateFleetBookingDto(
        bookingFactory.fleet({ userId: adeola.id }),
      );
      fleetBooking.endDateTime = new Date('2026-09-16T01:00:00.000Z');

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(tumise.email),
          fleetBooking,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(await prismaService.booking.count()).toBe(0);
    });

    it('throws ForbiddenException when the caller is not a super admin', async () => {
      const kemi = await factory.persist('user', () => userFactory.build());
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(kemi.email),
          toCreateFleetBookingDto(bookingFactory.fleet({ userId: adeola.id })),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(await prismaService.booking.count()).toBe(0);
    });

    it('throws ForbiddenException when the caller does not exist', async () => {
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createFleetBooking(
          RequestUser.of(faker.internet.email().toLowerCase()),
          toCreateFleetBookingDto(bookingFactory.fleet({ userId: adeola.id })),
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
          toCreateFleetBookingDto(
            bookingFactory.fleet({ userId: 999_999 }),
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(await prismaService.booking.count()).toBe(0);
    });
  });

  describe('createClientPickupBooking', () => {
    it('creates a client pickup booking and assignment for the chauffeur', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.build({ isSuperAdmin: true }),
      );
      const adeola = await factory.persist('user', () => userFactory.build());

      await adminController.createClientPickupBooking(
        RequestUser.of(tumise.email),
        toCreateClientPickupBookingDto(
          bookingFactory.clientPickup({ userId: adeola.id }),
          clientPickupDetailFactory.build(),
        ),
      );

      expect(
        await prismaService.booking.findFirst({
          where: { userId: adeola.id, type: BookingType.CLIENT },
        }),
      ).not.toBeNull();
      expect(
        await prismaService.bookingAssignment.findFirst({
          where: { userId: adeola.id, assignedById: tumise.id },
        }),
      ).not.toBeNull();
    });

    it('throws ForbiddenException when the caller is not a super admin', async () => {
      const kemi = await factory.persist('user', () => userFactory.build());
      const adeola = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.createClientPickupBooking(
          RequestUser.of(kemi.email),
          toCreateClientPickupBookingDto(
            bookingFactory.clientPickup({ userId: adeola.id }),
            clientPickupDetailFactory.build(),
          ),
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
          toCreateClientPickupBookingDto(
            bookingFactory.clientPickup({ userId: 999_999 }),
            clientPickupDetailFactory.build(),
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
