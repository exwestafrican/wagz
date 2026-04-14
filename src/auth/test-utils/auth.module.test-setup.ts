import { type EmailClient } from '@/messaging/email/email-client';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleService } from '@/permission/role/role.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { LinkService } from '@/common/link-service';

export function createMockEmailClient(): EmailClient {
  return {
    send: jest.fn().mockResolvedValue(undefined),
  };
}

export function useWorkspaceManagerFactory(
  mockEmailClient: EmailClient,
  prismaService: PrismaService,
  linkService: LinkService,
  workspaceInviteService: WorkspaceInviteService,
): WorkspaceManager {
  return new WorkspaceManager(
    prismaService,
    mockEmailClient,
    linkService,
    new RoleService(),
    workspaceInviteService,
  );
}
