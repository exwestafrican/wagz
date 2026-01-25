import { PERMISSIONS, ROLES } from '@/permission/types';

describe('types', () => {
  describe('permissions', () => {
    it('should have all unique codes', () => {
      const codes = Object.values(PERMISSIONS).map((p) => p.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('roles', () => {
    it('should have all unique codes', () => {
      const codes = Object.values(ROLES).map((r) => r.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });
  });
});
