import { Module } from '@nestjs/common';
import { WaitlistController } from '@/envoye/waitlist/waitlist.controller';
import { WaitlistService } from '@/envoye/waitlist/waitlist.service';

@Module({
  imports: [],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
