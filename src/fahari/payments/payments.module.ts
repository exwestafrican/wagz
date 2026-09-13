import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { ENVIROMENT } from '@/common/const';
import { AccountManager } from '@/fahari/payments/account-manager';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { PaymentsAdminController } from '@/fahari/payments/admin/payments-admin.controller';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';
import { MONNIFY_WEBHOOK_AUTH } from '@/fahari/payments/monnify/webhook/auth/monnify-webhook-auth';
import { ProductionMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/production';
import { NoopMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/noop';
import { MONNIFY_WEBHOOK_HANDLERS } from '@/fahari/payments/monnify/webhook/event-handler/webhook-handler';
import { PaymentCollectionWebhookHandler } from '@/fahari/payments/monnify/webhook/event-handler/payment-collection.handler';
import { MonnifyWebhookRouter } from '@/fahari/payments/monnify/webhook/monnify-webhook-router';

const MonnifyClientProvider = {
  provide: MonnifyClient,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new MonnifyClient(
      configService.getOrThrow<string>('MONNIFY_BASE_URL'),
      configService.getOrThrow<string>('MONNIFY_API_KEY'),
      configService.getOrThrow<string>('MONNIFY_SECRET_KEY'),
      configService.getOrThrow<string>('MONNIFY_CONTRACT_CODE'),
    ),
};

const MonnifyWebhookAuthProvider = {
  provide: MONNIFY_WEBHOOK_AUTH,
  inject: [ConfigService, MonnifyClient],
  useFactory: (configService: ConfigService, monnifyClient: MonnifyClient) => {
    if (configService.get<string>('NODE_ENV') === ENVIROMENT.PRODUCTION) {
      return new ProductionMonnifyWebhookAuth(monnifyClient);
    }
    return new NoopMonnifyWebhookAuth();
  },
};

const MonnifyWebhookHandlersProvider = {
  provide: MONNIFY_WEBHOOK_HANDLERS,
  inject: [PaymentCollectionWebhookHandler],
  useFactory: (
    paymentCollectionWebhookHandler: PaymentCollectionWebhookHandler,
  ) => [paymentCollectionWebhookHandler],
};

const MonnifyClientProvider = {
  provide: MonnifyClient,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new MonnifyClient(
      configService.getOrThrow<string>('MONNIFY_BASE_URL'),
      configService.getOrThrow<string>('MONNIFY_API_KEY'),
      configService.getOrThrow<string>('MONNIFY_SECRET_KEY'),
      configService.getOrThrow<string>('MONNIFY_CONTRACT_CODE'),
    ),
};

@Module({
  imports: [PrismaModule, FahariPermissionModule],
  providers: [
    AccountManager,
    MonnifyClientProvider,
    ReservedAccountService,
    PaymentCollectionService,
    PaymentNotificationService,
    PaymentCollectionWebhookHandler,
    MonnifyWebhookHandlersProvider,
    MonnifyWebhookRouter,
    MonnifyWebhookAuthProvider,
  ],
  controllers: [PaymentsAdminController, MonnifyWebhookController],
  exports: [ReservedAccountService, PaymentCollectionService],
})
export class PaymentsModule {}
