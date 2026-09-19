import {
  computeMonnifySignature,
  isValidMonnifySignature,
} from '@/fahari/payments/monnify/monnify-signature';

describe('monnify-signature', () => {
  const clientSecret = 'test-client-secret';
  const stringifiedBody = JSON.stringify({
    eventType: 'SUCCESSFUL_TRANSACTION',
    eventData: { amountPaid: 100 },
  });

  it('computes a stable hmac sha512 hex digest', () => {
    const first = computeMonnifySignature(clientSecret, stringifiedBody);
    const second = computeMonnifySignature(clientSecret, stringifiedBody);
    expect(first).toBe(second);
    expect(first).toHaveLength(128);
  });

  it('accepts a matching signature', () => {
    const signature = computeMonnifySignature(clientSecret, stringifiedBody);
    expect(
      isValidMonnifySignature(clientSecret, stringifiedBody, signature),
    ).toBe(true);
  });

  it('rejects missing or mismatched signatures', () => {
    expect(
      isValidMonnifySignature(clientSecret, stringifiedBody, undefined),
    ).toBe(false);
    expect(
      isValidMonnifySignature(clientSecret, stringifiedBody, 'deadbeef'),
    ).toBe(false);
  });
});
