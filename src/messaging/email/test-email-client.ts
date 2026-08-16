import { EmailClient, Mail } from '@/messaging/email/email-client';
import { Logger } from '@nestjs/common';

export class TestEmailClient implements EmailClient {
  logger = new Logger(TestEmailClient.name);

  send(email: Mail): Promise<void> {
    this.logger.log(
      `Sending Email: ${JSON.stringify({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
      })}`,
    );
    return Promise.resolve();
  }
}
