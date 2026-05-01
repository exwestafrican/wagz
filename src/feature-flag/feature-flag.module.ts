import { Module } from '@nestjs/common';
import { DeprecatedFeatureFlagService } from './deprecated-feature-flag.service';
import { FEATURE_FLAG_LOADER } from './const';
import { LocalFeatureFlagLoader } from './service/local-feature-flag-loader';
import FeatureFlagManager from '@/feature-flag/manager';

const FeatureFlagLoaderProvider = {
  provide: FEATURE_FLAG_LOADER,
  useFactory: () => {
    return new LocalFeatureFlagLoader();
  },
};
@Module({
  providers: [
    DeprecatedFeatureFlagService,
    FeatureFlagManager,
    FeatureFlagLoaderProvider,
  ],
  exports: [FEATURE_FLAG_LOADER, FeatureFlagManager],
})
export class FeatureFlagModule {}
