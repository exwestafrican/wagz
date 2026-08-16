import { JWTPayload } from 'jose';

export type AuthJwtPayload = JWTPayload & { email: string };

export interface VerifyAndDecodeResult {
  isValid: boolean;
  payload: AuthJwtPayload;
}

export default interface JwtVerifier {
  verifyAndDecode(token: string): Promise<VerifyAndDecodeResult>;
}
