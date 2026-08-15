import { createHash, randomBytes } from 'crypto';

export function generateDeviceApiKey(): string {
  return `trk_${randomBytes(32).toString('base64url')}`;
}

export function hashDeviceApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
