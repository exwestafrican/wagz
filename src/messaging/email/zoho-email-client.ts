import { EmailClient, Mail } from '@/messaging/email/email-client';
import { Contact } from '@/messaging/contact';
import { Logger } from '@nestjs/common';

type ZeptoContact = { address: string; name: string };
type ZeptoToContact = Array<{ email_address: ZeptoContact }>;

type ZeptoMailPayload = {
  from: ZeptoContact;
  to: ZeptoToContact;
  subject: string;
  htmlbody: string;
};

export interface ZeptoTransport {
  sendMail: (payload: ZeptoMailPayload) => Promise<void>;
}

export class ZohoEmailClient implements EmailClient {
  logger = new Logger(ZohoEmailClient.name);
  constructor(private readonly transport: ZeptoTransport) {}

  async send(email: Mail): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.toZeptoFromContact(email.from),
        to: this.toZeptoToContact([email.to]),
        subject: email.subject,
        htmlbody: email.html,
      });
    } catch (e) {
      console.log('error', e);
      throw e;
    }
  }

  private toZeptoToContact(contacts: Array<Contact>): ZeptoToContact {
    return contacts.map((contact) => ({
      email_address: {
        address: contact.email,
        name: contact.name,
      },
    }));
  }

  private toZeptoFromContact(contact: Contact): ZeptoContact {
    return {
      address: contact.email,
      name: contact.name,
    };
  }
}
