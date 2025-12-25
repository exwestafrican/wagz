import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import JoinWaitListDto from '@/waitlist/dto/join.waitlist.dto';
import { WaitlistService } from '@/waitlist/waitlist.service';

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
    await this.waitlistService.join(joinWaitListDto.email);
  }
}
