import { Module } from '@nestjs/common';
import { WaitlistController } from '@/waitlist/waitlist.controller';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { FeaturesService } from '@/roadmap/service/feature.service';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, FeaturesService],
})
export class WaitlistModule {}
