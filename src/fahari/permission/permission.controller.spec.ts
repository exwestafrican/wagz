import { PermissionController } from '@/fahari/permission/permission.controller';
import { FeatureFlag } from '@/fahari/permission/feature-flag';

describe('PermissionController', () => {
  const controller = new PermissionController();

  it('returns no active features', () => {
    expect(controller.listFeatures()).toEqual([]);
  });

  it('names the new booking experience for the frontend', () => {
    expect(FeatureFlag.NEW_BOOKING_EXPERIENCE.name).toBe(
      'new_booking_experience',
    );
  });
});
