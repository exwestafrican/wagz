import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConflictException, INestApplication } from '@nestjs/common';
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
import { addMinutes } from 'date-fns/addMinutes';
import { singeParticipantMessageHistory } from '@/test-helpers/messaging.helpers';
import { ConversationsService } from '@/conversations/conversations.service';
import { TestEmailClient } from '@/messaging/email/test-email-client';
import { LinkService } from '@/common/link-service';
import { mockConfigService } from '@/test-helpers/mocks';
import { ConversationType } from '@/conversations/const';

describe('EnvoyeMessenger', () => {
  let messenger: EnvoyeMessenger;
  let conversationsService: ConversationsService;
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
    const linkService = new LinkService(mockConfigService);
    conversationsService = new ConversationsService(
      prismaService,
      new TestEmailClient(),
      linkService,
    );
    messenger = new EnvoyeMessenger(prismaService, conversationsService);

    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function mockWorkspaceWithConversationHistory() {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      5,
    );

    const sammy = teammates[0];
    const derick = teammates[1];

    const conversationStartTime = Date.now();

    const chatHistory = [
      {
        senderId: sammy.id,
        messages: ['Hey how are you doing?', 'Just welcoming you to the team.'],
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

  describe('sendOpeningTextMessage', () => {
    it('creates an open conversation with the teammate as sole owner participant', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: 'owner@useenvoye.com' }),
      );
      const conversation = await messenger.sendOpeningTextMessage(
        teammate.id,
        [teammate.id],
        workspace.code,
        [],
        new Date(),
      );

      expect(conversation.workspaceCode).toBe(workspace.code);
      expect(conversation.status).toBe(ConversationStatus.OPEN);
      expect(conversation.participantSignature).toBe(
        `${workspace.code}:${teammate.id}`,
      );

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
        [marvin.id],
        workspace.code,
        [],
        new Date(),
      );

      expect(conversation.participantSignature).toBe(
        conversationsService.participantSignature(workspace.code, [
          dan.id,
          marvin.id,
        ]),
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

    it('orders teammate ids numerically in participant signature', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 4);

      const [dan, marvin] = teammates.slice(2);
      const [lowerTeammateId, higherTeammateId] = [dan.id, marvin.id].sort(
        (leftId, rightId) => leftId - rightId,
      );

      const conversation = await messenger.sendOpeningTextMessage(
        marvin.id,
        [dan.id],
        workspace.code,
        [],
        new Date(),
      );

      expect(conversation.participantSignature).toBe(
        `${workspace.code}:${lowerTeammateId}:${higherTeammateId}`,
      );
    });

    it('does not create signature when participants are more than 2', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 4);

      const [dan, marvin, tomisin] = teammates.slice(0, 3);

      const conversation = await messenger.sendOpeningTextMessage(
        marvin.id,
        [dan.id, tomisin.id],
        workspace.code,
        [],
        new Date(),
      );

      expect(conversation.participantSignature).toBe(null);
    });

    it('throws ConflictException when an ongoing two-participant conversation already exists', async () => {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const [dan, marvin] = teammates;

      await messenger.sendOpeningTextMessage(
        dan.id,
        [marvin.id],
        workspace.code,
        [],
        new Date(),
      );

      await expect(
        messenger.sendOpeningTextMessage(
          marvin.id,
          [dan.id],
          workspace.code,
          [],
          new Date(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(
        await prismaService.conversation.count({
          where: { workspaceCode: workspace.code },
        }),
      ).toBe(1);
    });

    it('throws ConflictException when a self-conversation already exists', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: 'owner@useenvoye.com' }),
      );

      await messenger.sendOpeningTextMessage(
        teammate.id,
        [teammate.id],
        workspace.code,
        [],
        new Date(),
      );

      await expect(
        messenger.sendOpeningTextMessage(
          teammate.id,
          [teammate.id],
          workspace.code,
          [],
          new Date(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(
        await prismaService.conversation.count({
          where: { workspaceCode: workspace.code },
        }),
      ).toBe(1);
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
        [marvin.id],
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
    it('we fetch chat history for conversation with less the chat limit', async () => {
      const { workspace, chatHistory } =
        await mockWorkspaceWithConversationHistory();

      const conversation = await singeParticipantMessageHistory(
        workspace,
        messenger,
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
        messenger,
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

  describe('load new messages', () => {
    async function assertLastReadMessageId(
      participantId: number,
      messageId: number,
    ) {
      const participantInfo =
        await prismaService.conversationParticipant.findFirstOrThrow({
          where: { id: participantId },
        });
      expect(participantInfo.lastReadMessage).toBe(messageId);
    }

    it('loads new messages from last read', async () => {
      const { workspace, chatHistory, sender, recipient } =
        await mockWorkspaceWithConversationHistory();

      const conversation = await singeParticipantMessageHistory(
        workspace,
        messenger,
        [
          ...chatHistory,
          {
            senderId: recipient.id,
            messages: ['talk later'],
            sentAt: addMinutes(chatHistory[4].sentAt, 5),
          },
        ],
      );

      const messages = await prismaService.message.findMany({
        where: { conversationId: conversation.id, workspace: workspace },
      });

      const participantInfo =
        await prismaService.conversationParticipant.findFirstOrThrow({
          where: { teammateId: sender.id, conversationId: conversation.id },
        });

      await messenger.markAsRead(participantInfo.id, messages[3].id);
      await assertLastReadMessageId(participantInfo.id, messages[3].id);

      const unreadMessages = await messenger.loadUnReadMessages(
        messages[3].authorId,
        conversation.id,
      );

      expect(unreadMessages).toHaveLength(2);
      await assertLastReadMessageId(participantInfo.id, messages[5].id); // last read message is last sent.
    });
  });

  describe('load conversations', () => {
    async function setupMixedConversationTypes() {
      const { workspace, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 10);

      const [dami, jess, amara, wole] = teammates.slice(4);

      const collaborativeConversation = await messenger.sendOpeningTextMessage(
        amara.id,
        [jess.id, dami.id],
        workspace.code,
        [],
        new Date(),
      );

      const directMessaging = await messenger.sendOpeningTextMessage(
        amara.id,
        [wole.id],
        workspace.code,
        [],
        new Date(),
      );

      const selfConversation = await messenger.sendOpeningTextMessage(
        amara.id,
        [],
        workspace.code,
        [],
        new Date(),
      );

      return {
        workspace,
        amara,
        collaborativeConversation,
        directMessaging,
        selfConversation,
      };
    }

    it('returns only collaborative conversations when conversationType is group', async () => {
      const { workspace, amara, collaborativeConversation } =
        await setupMixedConversationTypes();

      const conversations = await messenger.conversations(
        workspace.code,
        amara.id,
        ConversationType.COLLABORATIVE,
      );

      expect(conversations.map((conversation) => conversation.id)).toEqual([
        collaborativeConversation.id,
      ]);
    });

    it('returns only private conversations when conversationType is dm', async () => {
      const {
        workspace,
        amara,
        collaborativeConversation,
        directMessaging,
        selfConversation,
      } = await setupMixedConversationTypes();

      const conversations = await messenger.conversations(
        workspace.code,
        amara.id,
        ConversationType.PRIVATE,
      );

      expect(conversations.map((conversation) => conversation.id)).toEqual(
        expect.arrayContaining([directMessaging.id, selfConversation.id]),
      );
      expect(
        conversations.map((conversation) => conversation.id),
      ).not.toContain(collaborativeConversation.id);
    });

    it('returns all conversations when conversationType is all', async () => {
      const {
        workspace,
        amara,
        collaborativeConversation,
        directMessaging,
        selfConversation,
      } = await setupMixedConversationTypes();

      const conversations = await messenger.conversations(
        workspace.code,
        amara.id,
        ConversationType.ALL,
      );

      expect(conversations.map((conversation) => conversation.id)).toEqual(
        expect.arrayContaining([
          directMessaging.id,
          selfConversation.id,
          collaborativeConversation.id,
        ]),
      );
      expect(conversations).toHaveLength(3);
    });
  });
});
