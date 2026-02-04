import { JWTPayload } from 'jose';

export type AuthJwtPayload = JWTPayload & { email: string };

export default interface JwtVerifier {
  verify(token: string): Promise<boolean>;
  decode(token: string): Promise<AuthJwtPayload>;
}
