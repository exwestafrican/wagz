import { Module } from '@nestjs/common';
import FeatureFlagManager from '@/feature-flag/manager';
import { FeatureFlagController } from '@/feature-flag/feature-flag.controller';

@Module({
  providers: [FeatureFlagManager],
  controllers: [FeatureFlagController],
  exports: [FeatureFlagManager],
})
export class FeatureFlagModule {}
