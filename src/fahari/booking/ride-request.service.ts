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
import { toMinorUnits } from '@/fahari/booking/minor-units';

@Injectable()
export class RideRequestService {
  logger = new Logger(RideRequestService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly resortLineItemPricer: ResortLineItemPricer,
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

    const rideRequest = await this.prismaService.rideRequest.create({
      data: {
        experienceCode: experience.code,
        numberOfPassengers: createRideRequestDto.numberOfPassengers,
        pickupLocation: createRideRequestDto.pickupLocation,
        pickupDateTime: createRideRequestDto.pickupDateTime,
        departureDateTime: createRideRequestDto.departureDateTime,
        firstName: createRideRequestDto.firstName,
        lastName: createRideRequestDto.lastName,
        email: createRideRequestDto.email,
        countryCallingCode: createRideRequestDto.phoneNumber.countryCallingCode,
        nationalNumber: createRideRequestDto.phoneNumber.nationalNumber,
        currency: experience.currency,
        minorAmount: toMinorUnits(
          this.quotedMajorAmount(
            experience.code,
            numberOfNights,
            createRideRequestDto.numberOfPassengers,
          ),
          experience.currency,
        ),
        state: RideRequestState.PENDING,
      },
    });

    this.logger.log(`created ride request id=${rideRequest.id}`);

    return toRideRequestResponse(rideRequest);
  }

  private quotedMajorAmount(
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
