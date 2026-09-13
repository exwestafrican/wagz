import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';

export const MONNIFY_WEBHOOK_AUTH = Symbol('MONNIFY_WEBHOOK_AUTH');

export interface MonnifyWebhookAuth {
  runIfAuthenticated<T>(
    payload: MonnifyWebhookPayload,
    monnifySignature: string | undefined,
    action: () => Promise<T>,
  ): Promise<T>;
}
