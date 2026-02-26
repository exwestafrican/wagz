import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ZeptoTransport,
  ZohoEmailClient,
} from '@/messaging/email/zoho-email-client';
import { SendMailClient } from 'zeptomail';
import { EMAIL_CLIENT, EmailClient } from '@/messaging/email/email-client';
import nodemailer, { Transporter } from 'nodemailer';
import { MailpitEmailClient } from '@/messaging/email/mailpit-email-client';
import { ENVIROMENT } from '@/common/const';
import { TestEmailClient } from '@/messaging/email/test-email-client';

const MailerProvider = {
  provide: EMAIL_CLIENT,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): EmailClient => {
    switch (configService.get('NODE_ENV')) {
      case ENVIROMENT.PRODUCTION: {
        const url = configService.get<string>('ZEPTO_URL', '');
        const token = configService.get<string>('ZEPTO_TOKEN', '');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const transport = new SendMailClient({
          url,
          token,
        }) as unknown as ZeptoTransport;
        return new ZohoEmailClient(transport);
      }
      case ENVIROMENT.DEVELOPMENT: {
        const transport: Transporter = nodemailer.createTransport({
          host: 'host.docker.internal',
          port: 54325,
          secure: false,
        });
        return new MailpitEmailClient(transport);
      }
      default:
        return new TestEmailClient();
    }
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailerProvider],
  exports: [EMAIL_CLIENT],
})
export class MessagingModule {}
