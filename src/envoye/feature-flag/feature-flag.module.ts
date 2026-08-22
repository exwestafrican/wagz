import { Module } from '@nestjs/common';
import FeatureFlagManager from '@/envoye/feature-flag/manager';
import { FeatureFlagController } from '@/envoye/feature-flag/feature-flag.controller';

@Module({
  providers: [FeatureFlagManager],
  controllers: [FeatureFlagController],
  exports: [FeatureFlagManager],
})
export class FeatureFlagModule {}
