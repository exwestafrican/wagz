import { Module } from '@nestjs/common';
import { SetupAdministrativeWorkspaceCommand } from '@/commands/setup-administrative-workspace.command';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { WorkspaceModule } from '@/workspace/workspace.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkspaceModule],
  providers: [SetupAdministrativeWorkspaceCommand],
  exports: [SetupAdministrativeWorkspaceCommand],
})
export class CommandsModule {}
