import { Module } from '@nestjs/common';
import { SetupAdministrativeWorkspaceCommand } from '@/envoye/commands/setup-administrative-workspace.command';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AuthModule } from '@/envoye/auth/auth.module';
import { WorkspaceModule } from '@/envoye/workspace/workspace.module';
import { FeatureFlagModule } from '@/envoye/feature-flag/feature-flag.module';
import { ConversationsModule } from '@/envoye/conversations/conversations.module';

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
