import { createHmac, timingSafeEqual } from 'crypto';

export function computeMonnifySignature(
  clientSecret: string,
  stringifiedRequestBody: string,
): string {
  return createHmac('sha512', clientSecret)
    .update(stringifiedRequestBody)
    .digest('hex');
}

export function isValidMonnifySignature(
  clientSecret: string,
  stringifiedRequestBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const expected = computeMonnifySignature(
    clientSecret,
    stringifiedRequestBody,
  );
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
