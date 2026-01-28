import { EmailClient, Mail } from '@/messaging/email/email-client';
import { Logger } from '@nestjs/common';
import { Transporter } from 'nodemailer';

export class MailpitEmailClient implements EmailClient {
  logger = new Logger(MailpitEmailClient.name);

  constructor(private readonly transport: Transporter) {}

  async send(email: Mail): Promise<any> {
    try {
      await this.transport.sendMail({
        from: `"${email.from.name}" <${email.from.email}>`,
        to: `"${email.to.name}" <${email.to.email}>`,
        subject: email.subject,
        html: email.html,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
