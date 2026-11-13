import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
import { getClientDetailsOrThrow } from '@/fahari/booking/ride-booking/query';

describe('ChauffeurFare', () => {
  const chauffeurFare = new ChauffeurFare();
  const araIye = getClientDetailsOrThrow('araiye');
  const softDays = getClientDetailsOrThrow('softdays');
  const pickupDateTime = new Date('2026-10-21T14:00:00.000Z');

  it('prices a trip with no return at the same-day price', () => {
    expect(chauffeurFare.amount(araIye, pickupDateTime)).toBe(6_966_000);
  });

  it('prices a return on the pickup day at the same-day price', () => {
    expect(
      chauffeurFare.amount(
        araIye,
        pickupDateTime,
        new Date('2026-10-21T22:00:00.000Z'),
      ),
    ).toBe(6_966_000);
  });

  it('prices a return on a later day at the multi-day price', () => {
    expect(
      chauffeurFare.amount(
        araIye,
        pickupDateTime,
        new Date('2026-10-22T10:00:00.000Z'),
      ),
    ).toBe(8_824_500);
  });

  it('prices a soft days return on the pickup day at that client same-day price', () => {
    expect(
      chauffeurFare.amount(
        softDays,
        pickupDateTime,
        new Date('2026-10-21T22:00:00.000Z'),
      ),
    ).toBe(7_500_000);
  });

  it('throws when the return day is before the pickup day', () => {
    expect(() =>
      chauffeurFare.amount(
        araIye,
        pickupDateTime,
        new Date('2026-10-20T10:00:00.000Z'),
      ),
    ).toThrow('return must be on or after pickup');
  });

  it('throws when the client has no vehicles', () => {
    const araIyeWithoutVehicles = { ...araIye, vehicles: [] };

    expect(() =>
      chauffeurFare.amount(
        araIyeWithoutVehicles,
        pickupDateTime,
        new Date('2026-10-21T22:00:00.000Z'),
      ),
    ).toThrow('No vehicles available');
  });
});
