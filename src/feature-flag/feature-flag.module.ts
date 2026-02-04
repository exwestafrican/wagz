import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FEATURE_FLAG_LOADER } from './const';
import { LocalFeatureFlagLoader } from './service/local-feature-flag-loader';

const FeatureFlagLoaderProvider = {
  provide: FEATURE_FLAG_LOADER,
  useFactory: () => {
    return new LocalFeatureFlagLoader();
  },
};
@Module({
  providers: [FeatureFlagService, FeatureFlagLoaderProvider],
  exports: [FEATURE_FLAG_LOADER],
})
export class FeatureFlagModule {}
