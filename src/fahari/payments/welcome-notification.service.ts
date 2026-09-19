import { Inject, Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import React from 'react';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { WelcomeTeammateTemplate } from '@/emails/templates/fahari/welcome-teammate-template';
import { ReservedAccount } from '@/fahari/payments/domain/reserved-account';
import { FAHARI_PAYMENTS_EMAIL } from '@/fahari/const';
import { fullName } from '@/fahari/user/full-name';
import { User } from '@/generated/prisma/client';

@Injectable()
export class WelcomeNotificationService {
  private readonly logger = new Logger(WelcomeNotificationService.name);

  constructor(
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  async notify(owner: User, reservedAccount: ReservedAccount): Promise<void> {
    const accountName = fullName(owner);
    const emailHtml = await render(
      React.createElement(WelcomeTeammateTemplate, {
        accountName,
        bankName: reservedAccount.bankName,
        accountNumber: reservedAccount.accountNumber,
      }),
    );

    await this.emailClient.send({
      from: { email: FAHARI_PAYMENTS_EMAIL, name: 'Fleets by Fahari' },
      to: {
        email: owner.email,
        name: accountName,
      },
      subject: 'Welcome to Fleets by Fahari',
      html: emailHtml,
    });

    this.logger.log(`Welcome email sent for user: ${owner.id}`);
  }
}
