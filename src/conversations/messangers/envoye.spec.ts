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
import {
  Conversation,
  ConversationStatus,
  Workspace,
} from '@/generated/prisma/client';
import { resetDb } from '@/test-helpers/rest-db';
import { addMinutes } from 'date-fns/addMinutes';

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

  type MessageHistory = {
    senderId: number;
    messages: string[];
    sentAt: Date;
  };

  async function singeParticipantMessageHistory(
    workspace: Workspace,
    chatHistory: MessageHistory[],
  ): Promise<Conversation> {
    const openingMessage = chatHistory[0];
    const otherMessages = chatHistory.slice(1);
    const recipientReply: MessageHistory | undefined = chatHistory.find(
      (h) => h.senderId !== openingMessage.senderId,
    );

    const recipientId = recipientReply?.senderId ?? 0;

    const conversation = await messenger.sendOpeningTextMessage(
      openingMessage.senderId,
      recipientId,
      workspace.code,
      openingMessage.messages,
      openingMessage.sentAt,
    );

    for (const history of otherMessages) {
      await messenger.sendTextMessage(
        conversation.id,
        history.senderId,
        history.messages,
        history.sentAt,
      );
    }
    return conversation;
  }

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

  describe('chat History', () => {
    async function mockWorkspaceWithConversationHistory() {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 5);

      const sammy = teammates[0];
      const derick = teammates[1];

      const conversationStartTime = Date.now();

      const chatHistory = [
        {
          senderId: sammy.id,
          messages: [
            'Hey how are you doing?',
            'Just welcoming you to the team.',
          ],
          sentAt: addMinutes(conversationStartTime, 1),
        },
        {
          senderId: derick.id,
          messages: ['Heyyy thanks. I am excited to be here'],
          sentAt: addMinutes(conversationStartTime, 2),
        },
        {
          senderId: derick.id,
          messages: ["can't wait to get started."],
          sentAt: addMinutes(conversationStartTime, 3),
        },
        {
          senderId: sammy.id,
          messages: [
            "yeah! i'll add you to the team rituals!!",
            "How's on boarding going. I know it's a lot",
          ],
          sentAt: addMinutes(conversationStartTime, 4),
        },
        {
          senderId: derick.id,
          messages: ['yeah men, e go be.'],
          sentAt: addMinutes(conversationStartTime, 5),
        },
      ];

      return {
        workspace: workspace,
        sender: sammy,
        recipient: derick,
        chatHistory,
      };
    }

    it('we fetch chat history for conversation with less the chat limit', async () => {
      const { workspace, chatHistory } =
        await mockWorkspaceWithConversationHistory();

      const conversation = await singeParticipantMessageHistory(
        workspace,
        chatHistory,
      );

      const conversationHistory = await messenger.chatHistory(
        conversation.id,
        3,
      );

      const expectedResponse = [
        ["can't wait to get started."],
        [
          "yeah! i'll add you to the team rituals!!",
          "How's on boarding going. I know it's a lot",
        ],
        ['yeah men, e go be.'],
      ];
      expect(conversationHistory.map((msg) => msg.content)).toMatchObject(
        expectedResponse,
      );
    });

    it('we fetch correct chat history with cursor', async () => {
      const { workspace, chatHistory } =
        await mockWorkspaceWithConversationHistory();

      const conversation = await singeParticipantMessageHistory(
        workspace,
        chatHistory,
      );

      const conversationHistory = await messenger.chatHistory(
        conversation.id,
        3,
        chatHistory[2].sentAt.getTime(),
      );

      const expectedResponse = [
        ['Hey how are you doing?', 'Just welcoming you to the team.'],
        ['Heyyy thanks. I am excited to be here'],
      ];

      expect(conversationHistory.map((msg) => msg.content)).toMatchObject(
        expectedResponse,
      );
    });
  });
});
