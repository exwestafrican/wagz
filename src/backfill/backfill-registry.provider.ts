import { createTaskRegistry } from '@/backfill/task';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';
import { ConversationParticipantsSignature } from '@/backfill/tasks/participants-signature';
import { PrismaService } from '@/prisma/prisma.service';
import { ConversationsService } from '@/conversations/conversations.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConversationsModule } from '@/conversations/conversations.module';

export const BACKFILL_REGISTRY = Symbol('BACKFILL_REGISTRY');
export type Registry = ReturnType<typeof createTaskRegistry>;

export const BackfillRegistryProvider = {
  provide: BACKFILL_REGISTRY,
  imports: [PrismaModule, ConversationsModule],
  inject: [PrismaService, ConversationsService],
  useFactory: (
    prismaService: PrismaService,
    ConversationsService: ConversationsService,
  ) => {
    const registry = createTaskRegistry();
    // TODO: add alerting if task is older than a month.
    registry.register({
      name: 'Backfill Normalize Usernames',
      description:
        'Removes special characters from username and stores in normalized format',
      key: 'normalize_usernames',
      task: new NormalizeUsernames(prismaService),
      dateAdded: 1783166035, // 4th july 2026
    });
    registry.register({
      name: 'Backfill Conversations with no participant signature',
      description:
        'Backfills all conversation with at least 2 participants. It adds a participant signature to conversation',
      key: 'conversation_participant_signature',
      task: new ConversationParticipantsSignature(
        prismaService,
        ConversationsService,
      ),
      dateAdded: 1783166035, // 4th july 2026
    });
    return registry;
  },
};
