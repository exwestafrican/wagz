import { Inject, Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import React from 'react';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { PaymentReceivedTemplate } from '@/emails/templates/fahari/payment-received-template';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import type { PaymentCollection } from '@/generated/prisma/client';
import { fullName } from '@/fahari/user/full-name';
import { PAYMENTS_EMAIL } from '@/fahari/const';

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly paymentCollectionService: PaymentCollectionService,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  async notifyOrSkip(collection: PaymentCollection): Promise<void> {
    if (shouldNotify(collection)) {
      const driver = await this.prismaService.user.findUniqueOrThrow({
        where: { id: collection.userId },
      });

      const amountPaid = collection.amountPaid.toFixed(2);
      const emailHtml = await render(
        React.createElement(PaymentReceivedTemplate, {
          driverFirstName: driver.firstname,
          amountPaid,
          currency: collection.currency,
          senderAccountName: collection.senderAccountName,
          senderAccountNumber: collection.senderAccountNumber,
        }),
      );

      await this.emailClient.send({
        from: { email: PAYMENTS_EMAIL, name: 'Fahari Payments' },
        to: {
          email: driver.email,
          name: fullName(driver),
        },
        subject: `Payment received: ${collection.currency} ${amountPaid}`,
        html: emailHtml,
      });

      await this.paymentCollectionService.markNotified(collection.id);
      this.logger.log(
        `Payment received email sent for user: ${driver.id} collection: ${collection.id}`,
      );
    }
  }
}

function shouldNotify(collection: PaymentCollection): boolean {
  return collection.notifiedAt == null;
}
