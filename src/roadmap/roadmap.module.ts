import { Module } from '@nestjs/common';
import { RoadmapController } from './roadmap.controller';
import { FeaturesService } from './service/features.service';

@Module({
  controllers: [RoadmapController],
  providers: [FeaturesService],
})
export class RoadmapModule {}
