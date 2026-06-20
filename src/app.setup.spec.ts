import { ALLOWED_ORIGINS } from './app.setup';

describe('ALLOWED_ORIGINS', () => {
  it('is an explicit allowlist, never a wildcard', () => {
    expect(Array.isArray(ALLOWED_ORIGINS)).toBe(true);
    expect(ALLOWED_ORIGINS.length).toBeGreaterThan(0);
    expect(ALLOWED_ORIGINS).not.toContain('*');
  });

  it('contains the production frontend origins', () => {
    expect(ALLOWED_ORIGINS).toContain('https://envoye.co');
  });

  it('only contains absolute http(s) origins', () => {
    for (const origin of ALLOWED_ORIGINS) {
      expect(origin).toMatch(/^https?:\/\//);
    }
  });
});
