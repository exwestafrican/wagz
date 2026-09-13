import { AccountManager } from '@/fahari/payments/account-manager';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';

describe('AccountManager', () => {
  const accountManager = new AccountManager();

  it('returns FAH prefix followed by exactly six digits', () => {
    const accountReference = accountManager.generateAccountReference();
    expect(ACCOUNT_REFERENCE_PREFIX).toBe('FAH');
    expect(accountReference).toMatch(/^FAH\d{6}$/);
  });
});
