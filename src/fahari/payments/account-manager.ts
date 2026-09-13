import { Injectable } from '@nestjs/common';
import { generate } from 'generate-password';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';

@Injectable()
export class AccountManager {
  generateAccountReference(): string {
    const sixDigits = generate({
      length: 6,
      numbers: true,
      uppercase: false,
      lowercase: false,
      symbols: false,
      strict: false,
    });
    return `${ACCOUNT_REFERENCE_PREFIX}${sixDigits}`;
  }
}
