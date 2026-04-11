import { type EmailClient } from '@/messaging/email/email-client';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleService } from '@/permission/role/role.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';

export function createMockEmailClient(): EmailClient {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

export function useWorkspaceManagerFactory(
  mockEmailClient: EmailClient,
  prismaService: PrismaService,
  workspaceLinkService: WorkspaceLinkService,
  workspaceInviteService: WorkspaceInviteService,
): WorkspaceManager {
  return new WorkspaceManager(
    prismaService,
    mockEmailClient,
    workspaceLinkService,
    new RoleService(),
    workspaceInviteService,
  );
}

export function workspaceManagerTestingProvider(mockEmailClient: EmailClient) {
  return {
    provide: WorkspaceManager,
    useFactory: (
      prismaService: PrismaService,
      workspaceLinkService: WorkspaceLinkService,
      workspaceInviteService: WorkspaceInviteService,
    ) =>
      useWorkspaceManagerFactory(
        mockEmailClient,
        prismaService,
        workspaceLinkService,
        workspaceInviteService,
      ),
    inject: [PrismaService, WorkspaceLinkService, WorkspaceInviteService],
  };
}
