import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JoinWaitListDto } from '@/waitlist/dto/join.waitlist.dto';
import { WaitlistService } from '@/waitlist/waitlist.service';
import NotFoundInDb from '@/common/exceptions/not-found';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  @ApiOperation({ summary: 'Add user to waitlist' })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined waitlist',
  })
  @HttpCode(HttpStatus.CREATED)
  async join(@Body() joinWaitListDto: JoinWaitListDto) {
    try {
      await this.waitlistService.join(joinWaitListDto.email);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
