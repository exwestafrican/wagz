import { Injectable } from '@nestjs/common';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import type { MonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/monnify-webhook-auth';

@Injectable()
export class NoopMonnifyWebhookAuth implements MonnifyWebhookAuth {
  async runIfAuthenticated<T>(
    _payload: MonnifyWebhookPayload,
    _monnifySignature: string | undefined,
    action: () => Promise<T>,
  ): Promise<T> {
    // Monnify does not send monnify-signature in sandbox.
    return action();
  }
}
