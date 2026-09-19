import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PaymentNotificationService } from '@/fahari/notification/email/payment-notification.service';
import { WelcomeNotificationService } from '@/fahari/notification/email/welcome-notification.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentNotificationService, WelcomeNotificationService],
  exports: [PaymentNotificationService, WelcomeNotificationService],
})
export class FahariNotificationModule {}
