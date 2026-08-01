import { Module } from '@nestjs/common';
import { SetupAdministrativeWorkspaceCommand } from '@/commands/setup-administrative-workspace.command';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { FeatureFlagModule } from '@/feature-flag/feature-flag.module';
import { ConversationsModule } from '@/conversations/conversations.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorkspaceModule,
    FeatureFlagModule,
    ConversationsModule,
  ],
  providers: [SetupAdministrativeWorkspaceCommand],
  exports: [SetupAdministrativeWorkspaceCommand],
})
export class CommandsModule {}
