import { Module } from '@nestjs/common';
import { WorkspaceManager } from './workspace-manager.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';

@Module({
  imports: [PermissionModule, PrismaModule, MessagingModule],
  providers: [WorkspaceManager, WorkspaceLinkService, WorkspaceInviteService],
  controllers: [WorkspaceController],
  exports: [WorkspaceLinkService, WorkspaceManager],
})
export class WorkspaceModule {}
