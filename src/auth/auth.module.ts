import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import PasswordGenerator from './services/password.generator';
import { PrismaService } from '@/prisma/prisma.service';
import { JWT_VERIFIER } from '@/auth/consts';
import { SupabaseVerifier } from '@/auth/services/supabase-verifier';
import { PassportModule } from '@nestjs/passport';

const SupabaseAuthClient = {
  provide: SupabaseClient,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClient(
      configService.get<string>('SUPABASE_URL', ''),
      configService.get<string>('SUPABASE_KEY', ''),
    );
  },
};

const JwtVerifierProvider = {
  provide: JWT_VERIFIER,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new SupabaseVerifier(configService);
  },
};

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthClient,
    PasswordGenerator,
    PrismaService,
    JwtVerifierProvider,
  ],
})
export class AuthModule {}
