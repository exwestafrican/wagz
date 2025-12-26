import { Module } from '@nestjs/common';
import { WaitlistController } from '@/waitlist/waitlist.controller';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { RoadmapModule } from '@/roadmap/roadmap.module';

@Module({
  imports: [RoadmapModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
