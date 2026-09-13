import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import {
  MONNIFY_WEBHOOK_AUTH,
  type MonnifyWebhookAuth,
} from '@/fahari/payments/monnify/webhook/monnify-webhook-auth';
import { MonnifyWebhookRouter } from '@/fahari/payments/monnify/webhook/monnify-webhook-router';

@Controller('webhooks/monnify')
@ApiTags('fahari-payments')
export class MonnifyWebhookController {
  constructor(
    @Inject(MONNIFY_WEBHOOK_AUTH)
    private readonly monnifyWebhookAuth: MonnifyWebhookAuth,
    private readonly monnifyWebhookRouter: MonnifyWebhookRouter,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Monnify collection webhooks' })
  async handleWebhook(
    @Body() payload: MonnifyWebhookPayload,
    @Headers('monnify-signature') monnifySignature?: string,
  ): Promise<{ status: string }> {
    return this.monnifyWebhookAuth.runIfAuthenticated(
      payload,
      monnifySignature,
      () => this.monnifyWebhookRouter.handle(payload),
    );
  }
}
