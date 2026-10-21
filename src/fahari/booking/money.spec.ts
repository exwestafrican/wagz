import { formatMinorAmount, formatNaira, toKobo } from '@/fahari/booking/money';

describe('formatNaira', () => {
  it('formats 15 naira 99 kobo as 15.99', () => {
    expect(formatNaira(15, 99)).toBe('15.99');
  });

  it('formats a whole naira amount with two decimal places', () => {
    expect(formatNaira(150_000)).toBe('150000.00');
    expect(formatNaira(88_245)).toBe('88245.00');
  });

  it('rejects a fractional naira amount', () => {
    expect(() => formatNaira(15.5)).toThrow(
      'naira must be a whole number of 0 or more',
    );
  });

  it('rejects kobo outside 0 to 99', () => {
    expect(() => formatNaira(15, 100)).toThrow(
      'kobo must be a whole number from 0 to 99',
    );
    expect(() => formatNaira(15, -1)).toThrow(
      'kobo must be a whole number from 0 to 99',
    );
  });
});

describe('toKobo', () => {
  it('converts 15.99 to 1599 kobo', () => {
    expect(toKobo('15.99')).toBe(1_599);
    expect(formatMinorAmount(1_599)).toBe('15.99');
  });

  it('converts a whole naira amount to kobo', () => {
    expect(toKobo(formatNaira(88_245))).toBe(8_824_500);
    expect(formatMinorAmount(8_824_500)).toBe('88245.00');
  });

  it('rejects an amount without two decimal places', () => {
    expect(() => toKobo('15.9')).toThrow(
      'naira amount must use two decimal places',
    );
  });
});

describe('formatMinorAmount', () => {
  it('rejects a fractional kobo amount', () => {
    expect(() => formatMinorAmount(15.99)).toThrow(
      'kobo amount must be a whole number of 0 or more',
    );
  });
});
