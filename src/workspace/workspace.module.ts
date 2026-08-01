import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { LinkService } from '@/common/link-service';
import { AuthModule } from '@/auth/auth.module';
import { DebounceServiceProvider } from '@/common/debounce.service';
import { ConversationsModule } from '@/conversations/conversations.module';
import FeatureFlagManager from '@/feature-flag/manager';

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
