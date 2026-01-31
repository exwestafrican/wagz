import JwtVerifier from '@/auth/services/jwt-verifier';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  FlattenedJWSInput,
  JSONWebKeySet,
  JWSHeaderParameters,
  JWTPayload,
  jwtVerify,
} from 'jose';
import { ForbiddenException, Logger } from '@nestjs/common';

export class SupabaseVerifier implements JwtVerifier {
  logger = new Logger(SupabaseVerifier.name);
  private readonly supaBaseJwtKeys: {
    (
      protectedHeader?: JWSHeaderParameters,
      token?: FlattenedJWSInput,
    ): Promise<CryptoKey>;
    coolingDown: boolean;
    fresh: boolean;
    reloading: boolean;
    reload: () => Promise<void>;
    jwks: () => JSONWebKeySet | undefined;
  };
  constructor(private readonly configService: ConfigService) {
    const supabaseBaseUrl = this.configService.get<string>('SUPABASE_URL', '');
    this.supaBaseJwtKeys = createRemoteJWKSet(
      new URL(`${supabaseBaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  async verify(token: string): Promise<boolean> {
    const tokenPayload = await this.decode(token);
    return Object.values(tokenPayload).length !== 0;
  }

  async decode(token: string): Promise<JWTPayload> {
    const supabaseJwtIssuerUrl = this.configService.get<string>(
      'SUPABASE_JWT_ISSUER_URL',
      '',
    ); // we need another env variable because and couldn't use ``${supabaseBaseUrl}/auth/v1/` because of  https://github.com/exwestafrican/wagz/issues/67#issue-3879877203
    try {
      return await jwtVerify(token, this.supaBaseJwtKeys, {
        issuer: supabaseJwtIssuerUrl,
      })
        .catch((e) => {
          // We need this because it seems some async error happens :-(
          // https://github.com/exwestafrican/wagz/issues/67#issuecomment-3829126275
          this.logger.error(e);
          throw new ForbiddenException('Invalid Token');
        })
        .then((result) => result.payload);
    } catch (e) {
      this.logger.error('cannot verify token', e);
      throw new ForbiddenException('Invalid Token');
    }
  }
}
