import { NotFoundException } from '@nestjs/common';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';

describe('ResortLineItemPricer', () => {
  const pricer = new ResortLineItemPricer();
  const araIye = 'araiye';

  it('prices zero nights of accommodation at zero', () => {
    expect(pricer.total(araIye, 0, 'accommodation', 2)).toBe(150_000);
  });

  it('prices one night of accommodation at the base price', () => {
    expect(pricer.total(araIye, 1, 'accommodation', 2)).toBe(200_000);
  });

  it('adds the additional night price for every night on a longer stay', () => {
    expect(pricer.total(araIye, 2, 'accommodation', 2)).toBe(250_000);
  });

  it('prices are same day price for same day pickup and drop off', () => {
    expect(pricer.total(araIye, 0, 'ride', 3)).toBe(69_660);
  });

  it('prices a same-day ride from the provider that can carry the guests', () => {
    expect(pricer.total(araIye, 0, 'ride', 2)).toBe(69_660);
  });

  it('prices a multi-night ride at the multiple-day return price', () => {
    expect(pricer.total(araIye, 2, 'ride', 3)).toBe(88_245);
  });

  it('rejects a ride when no provider can carry the guests', () => {
    expect(() => pricer.total(araIye, 1, 'ride', 4)).toThrow(
      new NotFoundException('cannot find vehicle provider with capacity'),
    );
  });
});
