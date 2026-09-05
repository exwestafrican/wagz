import { Module } from '@nestjs/common';
import { CreateSuperAdminCommand } from '@/fahari/commands/create-super-admin.command';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/fahari/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [CreateSuperAdminCommand],
  exports: [CreateSuperAdminCommand],
})
export class CommandsModule {}
