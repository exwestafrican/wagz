import { JWTPayload } from 'jose';

export default interface JwtVerifier {
  verify(token: string): Promise<boolean>;
  decode(token: string): Promise<JWTPayload>;
}
