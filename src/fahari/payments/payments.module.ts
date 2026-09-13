import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { AccountManager } from '@/fahari/payments/account-manager';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { PaymentsAdminController } from '@/fahari/payments/admin/payments-admin.controller';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';

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
  ],
  controllers: [PaymentsAdminController, MonnifyWebhookController],
  exports: [ReservedAccountService, PaymentCollectionService],
})
export class PaymentsModule {}
