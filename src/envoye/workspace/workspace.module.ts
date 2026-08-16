import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { PermissionModule } from '@/common/permission/permission.module';
import { WorkspaceInviteService } from '@/envoye/workspace/workspace-invite-service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MessagingModule } from '@/common/messaging/messaging.module';
import { LinkService } from '@/common/link-service';
import { AuthModule } from '@/envoye/auth/auth.module';
import { DebounceServiceProvider } from '@/common/debounce.service';
import { ConversationsModule } from '@/envoye/conversations/conversations.module';
import FeatureFlagManager from '@/envoye/feature-flag/manager';

@Module({
  imports: [
    PermissionModule,
    PrismaModule,
    MessagingModule,
    AuthModule,
    ConversationsModule,
  ],
  providers: [
    WorkspaceManager,
    LinkService,
    WorkspaceInviteService,
    FeatureFlagManager,
    DebounceServiceProvider,
  ],
  controllers: [WorkspaceController],
  exports: [WorkspaceManager],
})
export class WorkspaceModule {}
