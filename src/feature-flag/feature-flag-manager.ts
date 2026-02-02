import { Injectable } from '@nestjs/common';
import { FeatureFlag } from '@/feature-flag/domain/feature-flag';

@Injectable()
export class FeatureFlagManager {
  public cache: Record<string, FeatureFlag> = {};
  public featureFlag: FeatureFlag[] = [];
  private ttl: number = 0;
  private isRefreshing: boolean = false;

  // contructor()
}
