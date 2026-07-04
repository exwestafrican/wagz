import { type EmailClient } from '@/messaging/email/email-client';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleService } from '@/permission/role/role.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { LinkService } from '@/common/link-service';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { ConversationsService } from '@/conversations/conversations.service';
import { TestEmailClient } from '@/messaging/email/test-email-client';

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
  const conversationsService = new ConversationsService(
    prismaService,
    new TestEmailClient(),
    linkService,
  );
  return new WorkspaceManager(
    prismaService,
    mockEmailClient,
    linkService,
    new RoleService(),
    workspaceInviteService,
    new EnvoyeMessenger(prismaService, conversationsService),
  );
}
