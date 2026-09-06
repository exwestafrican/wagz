import { User } from '@/generated/prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import NotFoundInDb from '@/common/exceptions/not-found';
import { BookingType } from '@/generated/prisma/enums';
import { CreateFleetBookingDto } from '@/fahari/booking/dto/create-fleet-booking.dto';
import { CreateClientPickupBookingDto } from '@/fahari/booking/dto/create-client-pickup-booking.dto';
import {
  BookingWithDetails,
  toBookingResponse,
  BookingResponseDto,
} from '@/fahari/booking/dto/booking-response.dto';
import {
  calendarDateFromIsoDate,
  timeOfDayFromHoursMinutes,
} from '@/fahari/booking/utils/booking-datetime';

const bookingWithDetailsInclude = {
  assignments: true,
  clientPickupDetail: true,
} as const;

@Injectable()
export class BookingService {
  logger = new Logger(BookingService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createFleetBooking(
    assignedBy: User,
    createFleetBookingDto: CreateFleetBookingDto,
  ): Promise<BookingResponseDto> {
    const chauffeur = await this.findChauffeurOrThrow(
      createFleetBookingDto.userId,
    );

    const booking = await this.prismaService.booking.create({
      data: {
        userId: chauffeur.id,
        date: calendarDateFromIsoDate(createFleetBookingDto.date),
        startTime: timeOfDayFromHoursMinutes(createFleetBookingDto.startTime),
        endTime: timeOfDayFromHoursMinutes(createFleetBookingDto.endTime),
        type: BookingType.FLEET,
        note: createFleetBookingDto.note,
        assignments: {
          create: {
            userId: chauffeur.id,
            assignedById: assignedBy.id,
          },
        },
      },
      include: bookingWithDetailsInclude,
    });

    this.logger.log(
      `created fleet booking id=${booking.id} userId=${chauffeur.id} assignedById=${assignedBy.id}`,
    );

    return toBookingResponse(booking as BookingWithDetails);
  }

  async createClientPickupBooking(
    assignedBy: User,
    createClientPickupBookingDto: CreateClientPickupBookingDto,
  ): Promise<BookingResponseDto> {
    const chauffeur = await this.findChauffeurOrThrow(
      createClientPickupBookingDto.userId,
    );

    const booking = await this.prismaService.booking.create({
      data: {
        userId: chauffeur.id,
        date: calendarDateFromIsoDate(createClientPickupBookingDto.date),
        startTime: timeOfDayFromHoursMinutes(
          createClientPickupBookingDto.startTime,
        ),
        type: BookingType.CLIENT,
        note: createClientPickupBookingDto.note,
        assignments: {
          create: {
            userId: chauffeur.id,
            assignedById: assignedBy.id,
          },
        },
        clientPickupDetail: {
          create: {
            firstName: createClientPickupBookingDto.firstName,
            lastName: createClientPickupBookingDto.lastName,
            pickupLocation: createClientPickupBookingDto.pickupLocation,
            locationUrl: createClientPickupBookingDto.locationUrl,
          },
        },
      },
      include: bookingWithDetailsInclude,
    });

    this.logger.log(
      `created client pickup booking id=${booking.id} userId=${chauffeur.id} assignedById=${assignedBy.id}`,
    );

    return toBookingResponse(booking as BookingWithDetails);
  }

  private async findChauffeurOrThrow(userId: number) {
    const chauffeur = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!chauffeur) {
      this.logger.warn(`chauffeur not found; userId=${userId}`);
      throw new NotFoundInDb(`user not found; userId=${userId}`);
    }

    return chauffeur;
  }
}
