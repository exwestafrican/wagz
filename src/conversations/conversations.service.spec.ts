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
import { ConversationsService } from './conversations.service';
import { ConversationStatus } from '@/generated/prisma/client';
import { resetDb } from '@/test-helpers/rest-db';

describe('ConversationsService', () => {
  let service: ConversationsService;
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
    service = new ConversationsService(prismaService);

    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('createSelfConversation', () => {
    it('creates an open conversation with the teammate as sole owner participant', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: 'owner@useenvoye.com' }),
      );
      const conversation = await service.createSelfConversation(
        workspace.code,
        teammate.id,
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
  });

  describe('createDirectMessage', () => {
    it('creates a conversation with two participants', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 4);

      const [dan, marvin] = teammates.slice(2);
      const conversation = await service.createDirectMessage(
        dan.id,
        marvin.id,
        workspace.code,
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
});
