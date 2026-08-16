import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWT_VERIFIER } from './consts';
import { SupabaseVerifier } from './supabase-verifier';

const JwtVerifierProvider = {
  provide: JWT_VERIFIER,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new SupabaseVerifier(configService);
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [JwtVerifierProvider],
  exports: [JWT_VERIFIER],
})
export class JwtVerifierModule {}
