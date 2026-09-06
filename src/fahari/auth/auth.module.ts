import { Module } from '@nestjs/common';
import { AuthController } from '@/fahari/auth/auth.controller';
import { AuthService } from '@/fahari/auth/auth.service';
import { CommonModule } from '@/common/common.module';
import { SupabaseClientModule } from '@/auth/supabase-client.module';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';

@Module({
  imports: [CommonModule, FahariPermissionModule, SupabaseClientModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, SupabaseClientModule],
})
export class AuthModule {}
