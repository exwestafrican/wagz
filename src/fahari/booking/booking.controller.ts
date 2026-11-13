import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { getExperience } from '@/fahari/booking/config';
import {
  type ExperienceResponseDto,
  toExperienceResponse,
} from '@/fahari/booking/dto/experience.dto';
import { CalculateBillingQueryDto } from '@/fahari/booking/dto/calculate-billing-query.dto';
import GetListingQueryDto from '@/fahari/booking/dto/get-listing.dto';
import { CreateRideRequestDto } from '@/fahari/booking/dto/create-ride-request.dto';
import { RideRequestResponseDto } from '@/fahari/booking/dto/ride-request-response.dto';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import { formatMinorAmount } from '@/fahari/booking/money';
import { RideRequestService } from '@/fahari/booking/ride-request.service';
import { CalculateRideFareQueryDto } from '@/fahari/booking/dto/calculate-ride-fare-query.dto';
import { GetChauffeurClientQueryDto } from '@/fahari/booking/dto/get-chauffeur-client-query.dto';
import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
import {
  getChauffeurClients,
  getClientDetails,
  getClientDetailsOrThrow,
} from '@/fahari/booking/ride-booking/query';
import { type ChauffeurClient } from '@/fahari/booking/ride-booking/ride-booking.config';
import { AddressSuggestionsQueryDto } from '@/fahari/booking/dto/address-suggestions-query.dto';
import {
  PlaceLocationParamsDto,
  PlaceLocationQueryDto,
} from '@/fahari/booking/dto/place-location-query.dto';
import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import {
  AddressSuggestion,
  PlaceLocation,
  PlacesUnavailableError,
} from '@/fahari/booking/places/places.types';

const ONE_MINUTE_MS = 60_000;

@Controller('booking')
export class BookingController {
  logger = new Logger(BookingController.name);

  constructor(
    private resortLineItemPricer: ResortLineItemPricer,
    private readonly rideRequestService: RideRequestService,
    private readonly chauffeurFare: ChauffeurFare,
    private readonly placesClient: GooglePlacesClient,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getListing(@Query() query: GetListingQueryDto): ExperienceResponseDto {
    const experience = getExperience(query.code);
    if (experience) {
      return toExperienceResponse(experience);
    }
    throw new NotFoundException();
  }

  @Get('chauffeur-clients')
  @HttpCode(HttpStatus.OK)
  listChauffeurClients(): ChauffeurClient[] {
    return getChauffeurClients();
  }

  @Get('chauffeur-client')
  @HttpCode(HttpStatus.OK)
  getChauffeurClient(
    @Query() query: GetChauffeurClientQueryDto,
  ): ChauffeurClient {
    const client = getClientDetails(query.code);
    if (client) {
      return client;
    }
    throw new NotFoundException();
  }

  @Get('calculate')
  @HttpCode(HttpStatus.OK)
  calculateBilling(@Query() query: CalculateBillingQueryDto): {
    amount: string;
  } {
    return {
      amount: formatMinorAmount(
        this.resortLineItemPricer.total(
          query.resortCode,
          query.numberOfNights,
          query.lineItem,
          query.numberOfGuests,
        ),
      ),
    };
  }

  @Get('calculate/ride-fare')
  @HttpCode(HttpStatus.OK)
  calculateRideFare(@Query() query: CalculateRideFareQueryDto) {
    const client = getClientDetailsOrThrow(query.clientCode);
    return {
      amount: formatMinorAmount(
        this.chauffeurFare.amount(
          client,
          query.pickupDateTime,
          query.returnDateTime,
        ),
      ),
    };
  }

  @Post('ride-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a ride request' })
  @ApiBody({ type: CreateRideRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ride request created',
    type: RideRequestResponseDto,
  })
  createRideRequest(
    @Body() createRideRequestDto: CreateRideRequestDto,
  ): Promise<RideRequestResponseDto> {
    try {
      return this.rideRequestService.create(createRideRequestDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  // Rate limited per visitor: these call Google with our key, and Google bills us per call.
  @Get('address-suggestions')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suggest pickup addresses as the guest types' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Google is switched off or failing; use a plain address field',
  })
  suggestAddresses(
    @Query() query: AddressSuggestionsQueryDto,
  ): Promise<AddressSuggestion[]> {
    return this.runIfPlacesAvailable(() =>
      this.placesClient.suggest(query.input, query.sessionToken),
    );
  }

  @Get('places/:placeId')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the location of a suggested address' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Google is switched off or failing',
  })
  locatePlace(
    @Param() params: PlaceLocationParamsDto,
    @Query() query: PlaceLocationQueryDto,
  ): Promise<PlaceLocation> {
    return this.runIfPlacesAvailable(() =>
      this.placesClient.locate(params.placeId, query.sessionToken),
    );
  }

  private async runIfPlacesAvailable<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof PlacesUnavailableError) {
        throw new ServiceUnavailableException();
      }
      throw error;
    }
  }
}
