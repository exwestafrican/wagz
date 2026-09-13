import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';

export interface MonnifyWebhookHandler {
  supports(payload: MonnifyWebhookPayload): boolean;
  handle(payload: MonnifyWebhookPayload): Promise<{ status: string }>;
}

export const MONNIFY_WEBHOOK_HANDLERS = Symbol('MONNIFY_WEBHOOK_HANDLERS');
