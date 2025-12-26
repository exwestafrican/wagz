import { Module } from '@nestjs/common';
import { RoadmapController } from '@/roadmap/roadmap.controller';
import { FeaturesService } from '@/roadmap/service/feature.service';

@Module({
  controllers: [RoadmapController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class RoadmapModule {}
