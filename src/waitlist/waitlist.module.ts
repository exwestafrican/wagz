import { Module } from '@nestjs/common';
import { WaitlistController } from '@/waitlist/waitlist.controller';
import { WaitlistService } from '@/waitlist/waitlist.service';

@Module({
  imports: [],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
