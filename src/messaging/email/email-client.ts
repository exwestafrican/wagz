import { Contact } from '@/messaging/contact';

export const EMAIL_CLIENT = Symbol('EMAIL_CLIENT');

export interface Mail {
  from: Contact;
  to: Contact;
  subject: string;
  html: string;
}

export interface EmailClient {
  send(email: Mail): Promise<void>;
}
