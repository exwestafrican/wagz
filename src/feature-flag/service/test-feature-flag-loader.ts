import { Injectable } from '@nestjs/common';
import FeatureFlagLoader from './feature-flag-loader';
import { FeatureFlag } from '../domain/feature-flag';

@Injectable()
export class TestFeatureFlagLoader implements FeatureFlagLoader {
  load() {
    return [
      FeatureFlag.of({
        key: 'can_integrate_whatsapp',
        name: 'Integrating whatsapp',
        description: 'Whatsapp added to the Envoye omnichannel',
      }),
      FeatureFlag.of({
        key: 'can_integrate_instagram',
        name: 'Integrating instagram',
        description: 'Instagram, added to the Envoye omnichannel',
      }),
      FeatureFlag.of({
        key: 'can_integrate_gmail',
        name: 'Integrating gmail',
        description: 'Gmail, added to the Envoye omnichannel',
      }),
    ];
  }
  enabledFeatures(workspaceCode: string): Array<string> {
    const featureFlags: FeatureFlag[] = this.load();

    return featureFlags
      .filter((featureFlag) => featureFlag.isEnabled(workspaceCode))
      .map((featureFlag) => featureFlag.key);
  }
}
