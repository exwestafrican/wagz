import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { getExperience } from '@/fahari/booking/config';
import {
  type ExperienceResponseDto,
  toExperienceResponse,
} from '@/fahari/booking/dto/experience.dto';
import { CalculateBillingQueryDto } from '@/fahari/booking/dto/calculate-billing-query.dto';
import GetListingQueryDto from '@/fahari/booking/dto/get-listing.dto';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';

@Controller('booking')
export class BookingController {
  logger = new Logger(BookingController.name);

  constructor(private resortLineItemPricer: ResortLineItemPricer) {}

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
    amount: number;
  } {
    return {
      amount: this.resortLineItemPricer.total(
        query.resortCode,
        query.numberOfNights,
        query.lineItem,
        query.numberOfGuests,
      ),
    };
  }
}
