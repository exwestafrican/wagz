import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { differenceInCalendarDays } from 'date-fns';
import { PrismaService } from '@/prisma/prisma.service';
import { RideRequestState } from '@/generated/prisma/enums';
import { getExperienceOrThrow } from '@/fahari/booking/config';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import { CreateRideRequestDto } from '@/fahari/booking/dto/create-ride-request.dto';
import {
  RideRequestResponseDto,
  toRideRequestResponse,
} from '@/fahari/booking/dto/ride-request-response.dto';
import Queue from '@/scheduler/queue';
import TaskQueue from '@/scheduler/tasks';
import RideRequestParams from '@/scheduler/params/ride-request.params';

@Injectable()
export class RideRequestService {
  logger = new Logger(RideRequestService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly resortLineItemPricer: ResortLineItemPricer,
    private readonly queue: Queue,
  ) {}

  async create(
    createRideRequestDto: CreateRideRequestDto,
  ): Promise<RideRequestResponseDto> {
    if (
      createRideRequestDto.departureDateTime.getTime() <=
      createRideRequestDto.pickupDateTime.getTime()
    ) {
      throw new BadRequestException('departure must be after pickup');
    }

    const experience = getExperienceOrThrow(
      createRideRequestDto.experienceCode,
    );
    const numberOfNights = differenceInCalendarDays(
      createRideRequestDto.departureDateTime,
      createRideRequestDto.pickupDateTime,
    );

    const quotedAmount = this.quote(
      experience.code,
      numberOfNights,
      createRideRequestDto.numberOfPassengers,
    );
    const rideRequest = await this.prismaService.rideRequest.create({
      data: {
        experienceCode: experience.code,
        numberOfPassengers: createRideRequestDto.numberOfPassengers,
        pickupLocation: createRideRequestDto.pickupLocation,
        nearestLandmark: createRideRequestDto.nearestLandmark,
        pickupDateTime: createRideRequestDto.pickupDateTime,
        departureDateTime: createRideRequestDto.departureDateTime,
        firstName: createRideRequestDto.firstName,
        lastName: createRideRequestDto.lastName,
        email: createRideRequestDto.email,
        countryCallingCode: createRideRequestDto.phoneNumber.countryCallingCode,
        nationalNumber: createRideRequestDto.phoneNumber.nationalNumber,
        currency: experience.currency,
        minorAmount: quotedAmount,
        state: RideRequestState.PENDING,
      },
    });

    this.logger.log(`created ride request id=${rideRequest.id}`);
    await this.queue.add(
      TaskQueue.NEW_RIDE_REQUEST,
      RideRequestParams.of(rideRequest.id, experience.code),
    );
    return toRideRequestResponse(rideRequest);
  }

  private quote(
    experienceCode: string,
    numberOfNights: number,
    numberOfPassengers: number,
  ) {
    try {
      return this.resortLineItemPricer.total(
        experienceCode,
        numberOfNights,
        'ride',
        numberOfPassengers,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
