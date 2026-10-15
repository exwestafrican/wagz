import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { type Experience, getExperience } from '@/fahari/booking/config';
import GetListingQueryDto from '@/fahari/booking/dto/get-listing.dto';

@Controller('booking')
export class BookingController {
  logger = new Logger(BookingController.name);

  @Get()
  @HttpCode(HttpStatus.OK)
  getListing(@Query() query: GetListingQueryDto): Experience {
    const experience = getExperience(query.code);
    if (experience) {
      return experience;
    }
    throw new NotFoundException();
  }
}
