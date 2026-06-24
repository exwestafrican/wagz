import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import Factory, { PersistStrategy } from '@/factories/factory';
import teammateFactory from '@/factories/teammate.factory';
import {
  setupWorkspaceWithMultipleTeammates,
  setupWorkspaceWithTeammate,
} from '@/test-helpers/workspace-helpers';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { ConversationStatus } from '@/generated/prisma/client';
import { resetDb } from '@/test-helpers/rest-db';

describe('EnvoyeMessenger', () => {
  let messenger: EnvoyeMessenger;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    messenger = new EnvoyeMessenger(prismaService);

    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('sendOpeningTextMessage', () => {
    it('creates an open conversation with the teammate as sole owner participant', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: 'owner@useenvoye.com' }),
      );
      const conversation = await messenger.sendOpeningTextMessage(
        teammate.id,
        teammate.id,
        workspace.code,
        [],
        new Date(),
      );

      expect(conversation.workspaceCode).toBe(workspace.code);
      expect(conversation.status).toBe(ConversationStatus.OPEN);

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: conversation.id },
        },
      );
      expect(participants).toHaveLength(1);
      expect(participants[0].teammateId).toBe(teammate.id);
      expect(participants[0].isOwner).toBe(true);
      expect(participants[0].workspaceCode).toBe(workspace.code);
    });

    it('creates a conversation with two participants', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 4);

      const [dan, marvin] = teammates.slice(2);
      const conversation = await messenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        workspace.code,
        [],
        new Date(),
      );

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: conversation.id },
        },
      );

      expect(participants).toHaveLength(2);
      expect(participants[0].isOwner).toBe(true);
      expect(participants[0].teammateId).toBe(dan.id);
    });
  });

  describe('sendTextMessage', () => {
    it('persists client-provided sentAt', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const [dan, marvin] = teammates;
      const sentAt = new Date('2026-06-20T10:00:00.000Z');

      const conversation = await messenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        workspace.code,
        [],
        new Date(),
      );

      const message = await messenger.sendTextMessage(
        conversation.id,
        dan.id,
        ['Hello'],
        sentAt,
      );

      expect(message.sentAt.toISOString()).toBe(sentAt.toISOString());
    });
  });
});
