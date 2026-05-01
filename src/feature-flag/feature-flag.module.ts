import { Module } from '@nestjs/common';
import FeatureFlagManager from '@/feature-flag/manager';

@Module({
  providers: [FeatureFlagManager],
  exports: [FeatureFlagManager],
})
export class FeatureFlagModule {}
