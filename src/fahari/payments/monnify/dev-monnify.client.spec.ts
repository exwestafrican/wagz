import { DevMonnifyClient } from '@/fahari/payments/monnify/dev-monnify.client';
import { MONIEPOINT_BANK_CODE } from '@/fahari/payments/monnify/monnify-bank-config';
import { ReserveAccountRequest } from '@/fahari/payments/monnify/monnify.types';

describe('DevMonnifyClient', () => {
  const reserveAccountRequest: ReserveAccountRequest = {
    accountReference: 'FAH12345',
    accountName: 'Ada Okonkwo',
    currencyCode: 'NGN',
    contractCode: 'dev-contract-code',
    customerEmail: 'ada@example.com',
    customerName: 'Ada Okonkwo',
    bvn: '21212121212',
    nin: '12034875601',
    getAllAvailableBanks: false,
    preferredBanks: [MONIEPOINT_BANK_CODE],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns echoed request fields and a fake Moniepoint account without calling Monnify', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const devMonnifyClient = new DevMonnifyClient();

    const reservedAccount = await devMonnifyClient.reserveAccount(
      reserveAccountRequest,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reservedAccount).toMatchObject({
      contractCode: 'dev-contract-code',
      accountReference: 'FAH12345',
      accountName: 'Ada Okonkwo',
      currencyCode: 'NGN',
      customerEmail: 'ada@example.com',
      customerName: 'Ada Okonkwo',
      status: 'ACTIVE',
      accounts: [
        {
          bankCode: MONIEPOINT_BANK_CODE,
          bankName: 'Moniepoint Microfinance Bank',
          accountName: 'Ada Okonkwo',
        },
      ],
    });
    const moniepointAccount = reservedAccount.accounts[0];
    expect(moniepointAccount?.accountNumber).toMatch(/^\d{10}$/);
  });
});
