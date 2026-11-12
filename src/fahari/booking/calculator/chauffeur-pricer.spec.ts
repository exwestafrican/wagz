import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
import { getClientDetailsOrThrow } from '@/fahari/booking/ride-booking/query';

describe('ChauffeurFare', () => {
  const chauffeurFare = new ChauffeurFare();
  const araIye = getClientDetailsOrThrow('araiye');
  const softDays = getClientDetailsOrThrow('softdays');

  it('prices a same-day trip at the same-day price', () => {
    expect(chauffeurFare.amount(araIye, null)).toBe(6_966_000);
  });

  it('prices a trip with a return date at the multi-day price', () => {
    expect(
      chauffeurFare.amount(araIye, new Date('2026-10-22T10:00:00.000Z')),
    ).toBe(8_824_500);
  });

  it('prices a soft days same-day trip at that client same-day price', () => {
    expect(chauffeurFare.amount(softDays, null)).toBe(7_500_000);
  });

  it('throws when the client has no vehicles', () => {
    const araIyeWithoutVehicles = { ...araIye, vehicles: [] };

    expect(() => chauffeurFare.amount(araIyeWithoutVehicles, null)).toThrow(
      'No vehicles available',
    );
  });
});
