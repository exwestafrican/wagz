import { type EmailClient } from '@/common/messaging/email/email-client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoleService } from '@/common/permission/role/role.service';
import { WorkspaceInviteService } from '@/envoye/workspace/workspace-invite-service';
import { WorkspaceManager } from '@/envoye/workspace/workspace-manager.service';
import { LinkService } from '@/common/link-service';
import EnvoyeMessenger from '@/envoye/conversations/messangers/envoye';
import { ConversationsService } from '@/envoye/conversations/conversations.service';
import { TestEmailClient } from '@/common/messaging/email/test-email-client';

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
