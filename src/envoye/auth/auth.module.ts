import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import PasswordGenerator from './services/password.generator';
import { PassportModule } from '@nestjs/passport';
import { TeammatesModule } from '@/envoye/teammates/teammates.module';
import { CommonModule } from '@/common/common.module';
import { PermissionModule } from '@/permission/permission.module';
import { SupabaseClientModule } from '@/auth/supabase-client.module';

@Module({
  imports: [
    PassportModule,
    CommonModule,
    TeammatesModule,
    PermissionModule,
    SupabaseClientModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordGenerator],
  exports: [AuthService],
})
export class AuthModule {}
