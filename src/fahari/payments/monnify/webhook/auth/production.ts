import { Injectable, UnauthorizedException } from '@nestjs/common';
import { isValidMonnifySignature } from '@/fahari/payments/monnify/monnify-signature';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import type { MonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/monnify-webhook-auth';

@Injectable()
export class ProductionMonnifyWebhookAuth implements MonnifyWebhookAuth {
  constructor(private readonly monnifyClient: MonnifyClient) {}

  async runIfAuthenticated<T>(
    payload: MonnifyWebhookPayload,
    monnifySignature: string | undefined,
    action: () => Promise<T>,
  ): Promise<T> {
    const stringifiedBody = JSON.stringify(payload);
    const isValid = isValidMonnifySignature(
      this.monnifyClient.secretKey,
      stringifiedBody,
      monnifySignature,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid Monnify webhook signature');
    }
    return action();
  }
}
