import { NotFoundException } from '@nestjs/common';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';

describe('ResortLineItemPricer', () => {
  const pricer = new ResortLineItemPricer();
  const araIye = 'araiye';

  it('prices zero nights of accommodation at the base price', () => {
    expect(pricer.total(araIye, 0, 'accommodation', 2)).toBe(15_000_000);
  });

  it('prices one night of accommodation at the base price plus one extra night', () => {
    expect(pricer.total(araIye, 1, 'accommodation', 2)).toBe(20_000_000);
  });

  it('adds the additional night price for every night on a longer stay', () => {
    expect(pricer.total(araIye, 2, 'accommodation', 2)).toBe(25_000_000);
  });

  it('prices are same day price for same day pickup and drop off', () => {
    expect(pricer.total(araIye, 0, 'ride', 3)).toBe(6_966_000);
  });

  it('prices a same-day ride from the provider that can carry the guests', () => {
    expect(pricer.total(araIye, 0, 'ride', 2)).toBe(6_966_000);
  });

  it('prices a multi-night ride at the multiple-day return price', () => {
    expect(pricer.total(araIye, 2, 'ride', 3)).toBe(8_824_500);
  });

  it('rejects a ride when no provider can carry the guests', () => {
    expect(() => pricer.total(araIye, 1, 'ride', 4)).toThrow(
      new NotFoundException('cannot find vehicle provider with capacity'),
    );
  });
});
