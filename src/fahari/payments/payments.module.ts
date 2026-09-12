import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { PaymentsAdminController } from '@/fahari/payments/admin/payments-admin.controller';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';

@Module({
  imports: [PrismaModule, FahariPermissionModule],
  providers: [
    MonnifyClient,
    ReservedAccountService,
    PaymentCollectionService,
    PaymentNotificationService,
  ],
  controllers: [PaymentsAdminController, MonnifyWebhookController],
  exports: [ReservedAccountService, PaymentCollectionService],
})
export class PaymentsModule {}
