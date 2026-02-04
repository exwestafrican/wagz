import JwtVerifier, {
  AuthJwtPayload,
  VerifyAndDecodeResult,
} from './jwt-verifier.interface';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  FlattenedJWSInput,
  JSONWebKeySet,
  JWSHeaderParameters,
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

  async verifyAndDecode(token: string): Promise<VerifyAndDecodeResult> {
    const supabaseJwtIssuerUrl = this.configService.get<string>(
      'SUPABASE_JWT_ISSUER_URL',
      '',
    ); // we need another env variable because and couldn't use ``${supabaseBaseUrl}/auth/v1/` because of  https://github.com/exwestafrican/wagz/issues/67#issue-3879877203
    try {
      return await jwtVerify(token, this.supaBaseJwtKeys, {
        issuer: supabaseJwtIssuerUrl,
      })
        .catch(() => {
          // We need this because it seems some async error happens :-(
          // https://github.com/exwestafrican/wagz/issues/67#issuecomment-3829126275
          return { isValid: false, payload: {} as AuthJwtPayload };
        })
        .then((result) => ({
          isValid: Object.values(result.payload).length !== 0,
          payload: result.payload as AuthJwtPayload,
        }));
    } catch (e) {
      this.logger.error('cannot verify token', e);
      return {
        isValid: false,
        payload: {} as AuthJwtPayload,
      };
    }
  }
}
