import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
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

@Controller('booking')
export class BookingController {
  logger = new Logger(BookingController.name);

  constructor(
    private resortLineItemPricer: ResortLineItemPricer,
    private readonly rideRequestService: RideRequestService,
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
    return this.rideRequestService.create(createRideRequestDto);
  }
}
