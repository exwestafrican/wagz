import { FeatureFlag } from '@/feature-flag/domain/feature-flag';

export const FEATURE_FLAG = [
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
export const ENVOYE_WORKSPACE_ID = 6;
export const ENVOYE_WORKSPACE_CODE = 'e8r4z7';
export const FEATURE_FLAG_LOADER = Symbol('FEATURE_FLAG_LOADER');
