import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthController } from '@/fahari/auth/auth.controller';
import { AuthService } from '@/fahari/auth/auth.service';
import { CommonModule } from '@/common/common.module';
import { PermissionModule } from '@/permission/permission.module';

const supabaseAuthClient = {
  provide: SupabaseClient,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClient(
      configService.get<string>('SUPABASE_URL', ''),
      configService.get<string>('SUPABASE_KEY', ''),
    );
  },
};

@Module({
  imports: [CommonModule, PermissionModule, ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, supabaseAuthClient],
  exports: [AuthService, SupabaseClient],
})
export class AuthModule {}
