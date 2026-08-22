import { Module } from '@nestjs/common';
import { RoadmapController } from '@/envoye/roadmap/roadmap.controller';
import { FeaturesService } from '@/envoye/roadmap/service/feature.service';
import { WaitlistService } from '@/envoye/waitlist/waitlist.service';
import { FeedbackService } from './service/feedback.service';

@Module({
  controllers: [RoadmapController],
  providers: [FeaturesService, WaitlistService, FeedbackService],
  exports: [],
})
export class RoadmapModule {}
