import { faker } from '@faker-js/faker';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { MONIEPOINT_BANK_CODE } from '@/fahari/payments/monnify/monnify-bank-config';
import {
  ReserveAccountRequest,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';

const DEV_CONTRACT_CODE = '1230062731';
const MONIEPOINT_BANK_NAME = 'Moniepoint Microfinance Bank';

export class DevMonnifyClient extends MonnifyClient {
  constructor() {
    super('', 'dev-api-key', 'dev-secret-key', DEV_CONTRACT_CODE);
  }

  override reserveAccount(
    request: ReserveAccountRequest,
  ): Promise<ReserveAccountResponseBody> {
    return Promise.resolve(this.fakeReservedAccountDetails(request));
  }

  override getReservedAccount(
    accountReference: string,
  ): Promise<ReserveAccountResponseBody> {
    return Promise.resolve(
      this.fakeReservedAccountDetails({
        accountReference,
        accountName: accountReference,
        currencyCode: 'NGN',
        contractCode: this.contractCode,
        customerEmail: 'dev@localhost',
        customerName: accountReference,
        bvn: '',
        nin: '',
        getAllAvailableBanks: false,
        preferredBanks: [MONIEPOINT_BANK_CODE],
      }),
    );
  }

  private fakeReservedAccountDetails(
    request: ReserveAccountRequest,
  ): ReserveAccountResponseBody {
    return {
      contractCode: request.contractCode,
      accountReference: request.accountReference,
      accountName: request.accountName,
      currencyCode: request.currencyCode,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      status: 'ACTIVE',
      accounts: [
        {
          bankCode: MONIEPOINT_BANK_CODE,
          bankName: MONIEPOINT_BANK_NAME,
          accountNumber: faker.string.numeric(10),
          accountName: request.accountName,
        },
      ],
    };
  }
}
