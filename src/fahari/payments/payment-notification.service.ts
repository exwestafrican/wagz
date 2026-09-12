import { Inject, Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import React from 'react';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { PaymentReceivedTemplate } from '@/fahari/emails/payment-received-template';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import type { PaymentCollection } from '@/generated/prisma/client';

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly paymentCollectionService: PaymentCollectionService,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  async notifyDriverOfPayment(collection: PaymentCollection): Promise<void> {
    this.logIfMissing(
      collection.userId,
      `Skipping payment notification; no user for collection ${collection.id}`,
    );
    if (!collection.userId) {
      return;
    }
    if (collection.notifiedAt) {
      return;
    }

    const driver = await this.prismaService.user.findUnique({
      where: { id: collection.userId },
    });
    this.logIfMissing(
      driver,
      `Skipping payment notification; user ${collection.userId} not found`,
    );
    if (!driver) {
      return;
    }

    const amountPaid = collection.amountPaid.toFixed(2);
    const emailHtml = await render(
      React.createElement(PaymentReceivedTemplate, {
        driverFirstName: driver.firstname,
        amountPaid,
        currency: collection.currency,
        senderAccountName: collection.senderAccountName ?? 'Not provided',
        senderAccountNumber: collection.senderAccountNumber ?? 'Not provided',
      }),
    );

    await this.emailClient.send({
      from: { email: 'payments@fahari.co', name: 'Fahari Payments' },
      to: {
        email: driver.email,
        name: `${driver.firstname} ${driver.lastname}`,
      },
      subject: `Payment received: ${collection.currency} ${amountPaid}`,
      html: emailHtml,
    });

    await this.paymentCollectionService.markNotified(collection.id);
    this.logger.log(
      `Payment received email sent for user: ${driver.id} collection: ${collection.id}`,
    );
  }

  private logIfMissing(value: unknown, message: string): void {
    if (!value) {
      this.logger.warn(message);
    }
  }
}
