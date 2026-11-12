import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RideRequestState } from '@/generated/prisma/enums';
import { getClientDetailsOrThrow } from '@/fahari/booking/ride-booking/query';
import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
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
    private readonly chauffeurFare: ChauffeurFare,
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

    const client = getClientDetailsOrThrow(createRideRequestDto.experienceCode);
    const vehicle = client.vehicles.at(0);
    if (
      !vehicle ||
      createRideRequestDto.numberOfPassengers > vehicle.maximumPassengers
    ) {
      throw new BadRequestException('cannot find vehicle with capacity');
    }

    const quotedAmount = this.chauffeurFare.amount(
      client,
      createRideRequestDto.pickupDateTime,
      createRideRequestDto.departureDateTime,
    );
    const rideRequest = await this.prismaService.rideRequest.create({
      data: {
        experienceCode: client.code,
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
        currency: 'NGN',
        minorAmount: quotedAmount,
        state: RideRequestState.PENDING,
      },
    });

    this.logger.log(`created ride request id=${rideRequest.id}`);
    await this.queue.add(
      TaskQueue.NEW_RIDE_REQUEST,
      RideRequestParams.of(rideRequest.id, client.code),
    );
    return toRideRequestResponse(rideRequest);
  }
}
