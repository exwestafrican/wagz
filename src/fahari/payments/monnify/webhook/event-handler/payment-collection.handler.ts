import { Injectable, Logger } from '@nestjs/common';
import {
  MONNIFY_RESERVED_ACCOUNT_PRODUCT,
  MONNIFY_SUCCESSFUL_TRANSACTION,
} from '@/fahari/payments/monnify/monnify.constants';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import type { MonnifyWebhookHandler } from '@/fahari/payments/monnify/webhook/event-handler/webhook-handler';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';

@Injectable()
export class PaymentCollectionWebhookHandler implements MonnifyWebhookHandler {
  private readonly logger = new Logger(PaymentCollectionWebhookHandler.name);

  constructor(
    private readonly paymentCollectionService: PaymentCollectionService,
    private readonly paymentNotificationService: PaymentNotificationService,
  ) {}

  supports(payload: MonnifyWebhookPayload): boolean {
    return (
      payload.eventType === MONNIFY_SUCCESSFUL_TRANSACTION &&
      payload.eventData.product.type === MONNIFY_RESERVED_ACCOUNT_PRODUCT
    );
  }

  async handle(payload: MonnifyWebhookPayload): Promise<{ status: string }> {
    const ingested =
      await this.paymentCollectionService.ingestSuccessfulCollection(payload);

    if (ingested?.isNew && !ingested.collection.notifiedAt) {
      void this.paymentNotificationService
        .notifyDriverOfPayment(ingested.collection)
        .catch((error: unknown) => {
          this.logger.error(
            `Failed sending payment notification for collection ${ingested.collection.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        });
    }

    return { status: 'ok' };
  }
}
