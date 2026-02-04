import { Inject, Injectable } from '@nestjs/common';
import { FEATURE_FLAG_LOADER } from '@/feature-flag/const';
import { indexBy, isEmpty, Time } from '@/common/utils';
import { FeatureFlag } from './domain/feature-flag';
import type FeatureFlagLoader from './service/feature-flag-loader';

@Injectable()
export class FeatureFlagService {
  private cache: {
    value: Map<string, FeatureFlag>;
    ttl: number;
    createdAt: number;
  } = {
    value: new Map<string, FeatureFlag>(),
    ttl: Time.durationInMilliseconds.minutes(2),
    createdAt: Date.now(),
  };

  constructor(
    @Inject(FEATURE_FLAG_LOADER)
    private readonly featureFlagLoader: FeatureFlagLoader,
  ) {}

  private load() {
    const featureFlags = this.featureFlagLoader.load();
    return indexBy(featureFlags, (featureFlag) => featureFlag.key);
  }

  private updateCache(value: Map<string, FeatureFlag>) {
    this.cache = {
      value: value,
      ttl: Time.durationInMilliseconds.minutes(2),
      createdAt: Date.now(),
    };
  }

  private refresh() {
    const cacheValue = this.load();
    this.updateCache(cacheValue);
  }

  private isCacheEmpty() {
    return isEmpty(this.cache.value);
  }

  public isEnabled(key: string, workspaceCode: string) {
    if (this.isCacheEmpty()) {
      this.refresh();
    }
    const featureFlag = this.cache.value.get(key);
    return featureFlag?.isEnabled(workspaceCode);
  }

  public enabledFeatures(workspaceCode: string) {
    return this.featureFlagLoader.enabledFeatures(workspaceCode);
  }
}
