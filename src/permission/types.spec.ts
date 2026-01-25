import { PERMISSIONS, ROLES } from '@/permission/types';

describe('types', () => {
  describe('permissions', () => {
    it('should have all unique codes', () => {
      const codes = Object.values(PERMISSIONS).map((p) => p.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have non-empty codes', () => {
      Object.values(PERMISSIONS).forEach((permission) => {
        expect(permission.code).toBeTruthy();
        expect(permission.code.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty names', () => {
      Object.values(PERMISSIONS).forEach((permission) => {
        expect(permission.name).toBeTruthy();
        expect(permission.name.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty description', () => {
      Object.values(PERMISSIONS).forEach((permission) => {
        expect(permission.description).toBeTruthy();
        expect(permission.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('roles', () => {
    it('should have all unique codes', () => {
      const codes = Object.values(ROLES).map((r) => r.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have non-empty code', () => {
      Object.values(ROLES).forEach((roles) => {
        expect(roles.code).toBeTruthy();
        expect(roles.code.length).toBeGreaterThan(0);
      });
    });
  });
});
