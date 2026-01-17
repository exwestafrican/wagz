import { Module } from '@nestjs/common';
import { RoadmapController } from '@/roadmap/roadmap.controller';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { FeedbackService } from './service/feedback.service';

@Module({
  controllers: [RoadmapController],
  providers: [FeaturesService, WaitlistService, FeedbackService],
  exports: [],
})
export class RoadmapModule {}
