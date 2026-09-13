import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import {
  MONNIFY_WEBHOOK_HANDLERS,
  type MonnifyWebhookHandler,
} from '@/fahari/payments/monnify/webhook/event-handler/webhook-handler';

@Injectable()
export class MonnifyWebhookRouter {
  private readonly logger = new Logger(MonnifyWebhookRouter.name);

  constructor(
    @Inject(MONNIFY_WEBHOOK_HANDLERS)
    private readonly handlers: MonnifyWebhookHandler[],
  ) {}

  async handle(payload: MonnifyWebhookPayload): Promise<{ status: string }> {
    const handler = this.handlers.find((candidate) =>
      candidate.supports(payload),
    );
    if (!handler) {
      this.logger.warn(
        `No Monnify webhook handler for eventType=${payload.eventType} productType=${payload.eventData.product.type}`,
      );
      //TODO: Send alert: Unknown event
      return { status: 'ok' };
    }
    return handler.handle(payload);
  }
}
