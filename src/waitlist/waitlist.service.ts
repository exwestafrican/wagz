import { Injectable } from '@nestjs/common';
import { FeaturesService } from '@/roadmap/service/feature.service';

@Injectable()
export class WaitlistService {
  constructor(private readonly featureService: FeaturesService) {}

  async join(email: string) {
    const mainFeature = await this.featureService.mainFeature();
    //TODO: create subscription for main feature
  }
}
