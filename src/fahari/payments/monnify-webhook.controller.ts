import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ENVIROMENT } from '@/common/const';
import { isValidMonnifySignature } from '@/fahari/payments/monnify/monnify-signature';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';

@Controller('webhooks/monnify')
@ApiTags('fahari-payments')
export class MonnifyWebhookController {
  private readonly logger = new Logger(MonnifyWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly monnifyClient: MonnifyClient,
    private readonly paymentCollectionService: PaymentCollectionService,
    private readonly paymentNotificationService: PaymentNotificationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Monnify collection webhooks' })
  async handleWebhook(
    @Body() payload: MonnifyWebhookPayload,
    @Headers('monnify-signature') monnifySignature?: string,
  ): Promise<{ status: string }> {
    this.verifySignatureOrThrow(payload, monnifySignature);

    const ingested =
      await this.paymentCollectionService.ingestSuccessfulCollection(payload);

    if (
      ingested?.isNew &&
      ingested.collection.userId &&
      !ingested.collection.notifiedAt
    ) {
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

  private verifySignatureOrThrow(
    payload: MonnifyWebhookPayload,
    monnifySignature: string | undefined,
  ): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isProduction = nodeEnv === ENVIROMENT.PRODUCTION;

    if (!isProduction && !monnifySignature) {
      return;
    }

    const stringifiedBody = JSON.stringify(payload);
    const isValid = isValidMonnifySignature(
      this.monnifyClient.clientSecret(),
      stringifiedBody,
      monnifySignature,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid Monnify webhook signature');
    }
  }
}
