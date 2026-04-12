import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import PasswordGenerator from './services/password.generator';
import { PassportModule } from '@nestjs/passport';
import { TeammatesModule } from '@/teammates/teammates.module';
import { CommonModule } from '@/common/common.module';
import { PermissionService } from '@/permission/permission.service';

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
  imports: [PassportModule, CommonModule, TeammatesModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthClient,
    PasswordGenerator,
    PermissionService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
