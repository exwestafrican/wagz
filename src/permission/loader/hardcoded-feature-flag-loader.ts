import { FeatureFlagLoader } from '@/permission/loader/feature-flag-loader';
import { FeatureFlag } from '@/feature-flag-depreciated/domain/feature-flag';
import { FeatureStatus } from '@/feature-flag-depreciated/domain/feature-status';

class HardcodedFeatureFlagLoader implements FeatureFlagLoader {
  load(): FeatureFlag[] {
    return [
      FeatureFlag.of({
        key: 'can_integrate_whatsapp',
        name: 'Integrating whatsapp',
        description: 'Whatsapp added to the Envoye omnichannel',
        addedBy: 'laura',
        status: FeatureStatus.partiallyEnabled,
        workspaceID: [6],
        deleted: false,
      }),
      FeatureFlag.of({
        key: 'can_integrate_instagram',
        name: 'Integrating instagram',
        description: 'Instagram, added to the Envoye omnichannel',
        addedBy: 'alade',
        status: FeatureStatus.globallyEnabled,
        workspaceID: [6],
        deleted: false,
      }),
      FeatureFlag.of({
        key: 'can_integrate_gmail',
        name: 'Integrating gmail',
        description: 'Gmail, added to the Envoye omnichannel',
        addedBy: 'laura',
        status: FeatureStatus.notEnabled,
        workspaceID: [6],
        deleted: false,
      }),
    ];
  }
}
