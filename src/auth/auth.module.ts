import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import PasswordGenerator from './services/password.generator';
import { PrismaService } from '../prisma/prisma.service';

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

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthClient,
    PasswordGenerator,
    PrismaService,
  ],
})
export class AuthModule {}
