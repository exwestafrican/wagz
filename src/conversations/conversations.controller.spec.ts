import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ConversationsController } from './conversations.controller';
import RequestUser from '@/auth/domain/request-user';
import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { createTestApp } from '@/test-helpers/test-app';
import { ConversationsService } from '@/conversations/conversations.service';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { TeammatesService } from '@/teammates/teammates.service';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { setupWorkspaceWithMultipleTeammates } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import workspaceFactory from '@/factories/workspace.factory';
import { resetDb } from '@/test-helpers/rest-db';
import { ROLES } from '@/permission/types';
import { CreateConversationDto } from '@/conversations/dto/create-conversation.dto';
import { SendTextMessageDto } from '@/conversations/dto/send-message.dto';

const validSentAt = new Date('2026-06-20T10:00:00.000Z');
const futureSentAt = new Date(Date.now() + 60_000);

describe('ConversationsController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let controller: ConversationsController;
  let conversationsService: ConversationsService;
  let envoyeMessenger: EnvoyeMessenger;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.com');

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);

    const roleService = new RoleService();
    conversationsService = new ConversationsService(prismaService);
    const teammatesService = new TeammatesService(prismaService);
    const permissionService = new PermissionService(prismaService, roleService);
    envoyeMessenger = new EnvoyeMessenger(prismaService);

    controller = new ConversationsController(
      conversationsService,
      teammatesService,
      permissionService,
      envoyeMessenger,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('createDirectMessage', () => {
    it('creates a direct message conversation when sender DMs a teammate in the same workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const body = await controller.createDirectMessage(requestUser, {
        workspaceCode: koboMart.code,
        recipientTeammateId: marvin.id,
        openingMessage: ['Hey, how are you feeling.'],
        sentAt: validSentAt,
      });

      expect(body.workspaceCode).toBe(koboMart.code);

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: body.id },
        },
      );
      expect(participants).toHaveLength(2);
      expect(participants.map((participant) => participant.teammateId)).toEqual(
        expect.arrayContaining([dan.id, marvin.id]),
      );
    });

    it('creates a self-conversation when sender DMs themselves', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const body = await controller.createDirectMessage(requestUser, {
        workspaceCode: koboMart.code,
        recipientTeammateId: dan.id,
        openingMessage: ['in the office today?'],
        sentAt: validSentAt,
      });

      expect(body.workspaceCode).toBe(koboMart.code);

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: body.id },
        },
      );
      expect(participants).toHaveLength(1);
      expect(participants[0].teammateId).toBe(dan.id);
      expect(participants[0].isOwner).toBe(true);
    });

    it('throws BadRequestException when recipient is in a different workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const zuriBakery = await factory.persist('workspace', () =>
        workspaceFactory.build(),
      );
      const marvinInZuriBakery = await factory.persist('teammate', () =>
        teammateFactory.build({ workspaceCode: zuriBakery.code }),
      );

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: koboMart.code,
          recipientTeammateId: marvinInZuriBakery.id,
          openingMessage: ['wagwan G!'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when sender is not an active member of the workspace', async () => {
      const { teammates } = await setupWorkspaceWithMultipleTeammates(
        factory,
        2,
      );
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: '345dv5',
          recipientTeammateId: marvin.id,
          openingMessage: ['Welcome to Envoye!'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when sender lacks message_teammates permission', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email, groups: [] },
      });
      const marvin = teammates[1];

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: koboMart.code,
          recipientTeammateId: marvin.id,
          openingMessage: ['Lets sync a bit later'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when recipient teammate id does not exist', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: koboMart.code,
          recipientTeammateId: 999999,
          openingMessage: ['Note to self'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('persists opening message with client-provided sentAt', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const body = await controller.createDirectMessage(requestUser, {
        workspaceCode: koboMart.code,
        recipientTeammateId: marvin.id,
        openingMessage: ['Hey there'],
        sentAt: validSentAt,
      });

      const openingMessage = await prismaService.message.findFirst({
        where: { conversationId: body.id },
      });

      expect(openingMessage?.content).toBe('Hey there');
      expect(openingMessage?.sentAt.toISOString()).toBe(
        validSentAt.toISOString(),
      );
    });
  });

  describe('listConversations', () => {
    it('returns conversation metadata for the requesting teammate in the workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      const conversations = await controller.listConversations(requestUser, {
        workspaceCode: koboMart.code,
      });

      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toEqual({
        id: conversation.id,
        authorId: dan.id,
        participantIds: [marvin.id],
      });
    });

    it('returns self-conversation metadata when the user has a self DM', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        dan.id,
        koboMart.code,
        [],
        new Date(),
      );

      const conversations = await controller.listConversations(requestUser, {
        workspaceCode: koboMart.code,
      });

      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toEqual({
        id: conversation.id,
        authorId: dan.id,
        participantIds: [],
      });
    });

    it('does not return conversations from other workspaces', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      const zuriBakery = await factory.persist('workspace', () =>
        workspaceFactory.build(),
      );
      const danInZuriBakery = await factory.persist('teammate', () =>
        teammateFactory.build({
          workspaceCode: zuriBakery.code,
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        }),
      );
      const marvinInZuriBakery = await factory.persist('teammate', () =>
        teammateFactory.build({ workspaceCode: zuriBakery.code }),
      );

      await envoyeMessenger.sendOpeningTextMessage(
        danInZuriBakery.id,
        marvinInZuriBakery.id,
        zuriBakery.code,
        [],
        new Date(),
      );

      const koboMartConversations = await controller.listConversations(
        requestUser,
        { workspaceCode: koboMart.code },
      );
      const zuriBakeryConversations = await controller.listConversations(
        requestUser,
        { workspaceCode: zuriBakery.code },
      );

      expect(koboMartConversations).toHaveLength(1);
      expect(zuriBakeryConversations).toHaveLength(1);
      expect(koboMartConversations[0].authorId).toBe(dan.id);
      expect(zuriBakeryConversations[0].authorId).toBe(danInZuriBakery.id);
    });

    it('returns an empty list when the user has no conversations', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const conversations = await controller.listConversations(requestUser, {
        workspaceCode: koboMart.code,
      });

      expect(conversations).toEqual([]);
    });

    it('throws ForbiddenException when sender is not an active member of the workspace', async () => {
      const { teammates } = await setupWorkspaceWithMultipleTeammates(
        factory,
        1,
      );
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      await expect(
        controller.listConversations(requestUser, {
          workspaceCode: '345dv5',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when sender lacks message_teammates permission', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email, groups: [] },
      });

      await expect(
        controller.listConversations(requestUser, {
          workspaceCode: koboMart.code,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendTextMessage', () => {
    it('persists a text message when sender is a participant', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      await controller.sendTextMessage(requestUser, {
        workspaceCode: koboMart.code,
        conversationId: conversation.id,
        message: ['Hey buddy'],
        sentAt: validSentAt,
      });

      const createdMessage = await prismaService.message.findFirst({
        where: {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
          authorId: dan.id,
        },
      });

      expect(createdMessage).toBeTruthy();
      expect(createdMessage?.content).toBe('Hey buddy');
      expect(createdMessage?.sentAt.toISOString()).toBe(
        validSentAt.toISOString(),
      );
    });

    it('throws Not found when sender is not a participant', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);

      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const dan = teammates[1];
      const marvin = teammates[2];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
          message: ['Hey buddy'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when sender is not an active member of the workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: '345dv5',
          conversationId: conversation.id,
          message: ['Hey buddy'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when sender lacks message_teammates permission', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        new Date(),
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
          message: ['Hey buddy'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws Not Found when conversation id does not exist', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);

      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: 999999,
          message: ['Hey buddy'],
          sentAt: validSentAt,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('chatHistory', () => {
    const openingSentAt = new Date('2026-06-20T10:00:00.000Z');
    const replySentAt = new Date('2026-06-20T10:01:00.000Z');
    const followUpSentAt = new Date('2026-06-20T10:02:00.000Z');

    it('returns mapped chat history when requester is a participant', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        ['Hey Marvin'],
        openingSentAt,
      );

      await envoyeMessenger.sendTextMessage(
        conversation.id,
        marvin.id,
        ['Hey Dan'],
        replySentAt,
      );

      const chatHistory = await controller.chatHistory(requestUser, {
        workspaceCode: koboMart.code,
        conversationId: conversation.id,
      });

      expect(chatHistory).toHaveLength(2);
      expect(chatHistory[0]).toMatchObject({
        authorId: dan.id,
        content: ['Hey Marvin'],
        sentAt: openingSentAt.getTime(),
        type: 'text',
      });
      expect(chatHistory[1]).toMatchObject({
        authorId: marvin.id,
        content: ['Hey Dan'],
        sentAt: replySentAt.getTime(),
        type: 'text',
      });
    });

    it('returns an empty list when the conversation has no messages', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        [],
        openingSentAt,
      );

      const chatHistory = await controller.chatHistory(requestUser, {
        workspaceCode: koboMart.code,
        conversationId: conversation.id,
      });

      expect(chatHistory).toEqual([]);
    });

    it('returns older messages when lastMessageSentAt cursor is provided', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        ['First message'],
        openingSentAt,
      );

      await envoyeMessenger.sendTextMessage(
        conversation.id,
        marvin.id,
        ['Second message'],
        replySentAt,
      );

      await envoyeMessenger.sendTextMessage(
        conversation.id,
        dan.id,
        ['Third message'],
        followUpSentAt,
      );

      const chatHistory = await controller.chatHistory(requestUser, {
        workspaceCode: koboMart.code,
        conversationId: conversation.id,
        lastMessageSentAt: followUpSentAt.getTime(),
      });

      expect(chatHistory).toHaveLength(2);
      expect(chatHistory.map((message) => message.content)).toEqual([
        ['First message'],
        ['Second message'],
      ]);
    });

    it('throws NotFoundException when requester is not a participant', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);

      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const dan = teammates[1];
      const marvin = teammates[2];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        ['Hey Marvin'],
        openingSentAt,
      );

      await expect(
        controller.chatHistory(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not an active member of the workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        ['Hey Marvin'],
        openingSentAt,
      );

      await expect(
        controller.chatHistory(requestUser, {
          workspaceCode: '345dv5',
          conversationId: conversation.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when requester lacks message_teammates permission', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);

      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [],
        },
      });
      const marvin = teammates[1];

      const conversation = await envoyeMessenger.sendOpeningTextMessage(
        dan.id,
        marvin.id,
        koboMart.code,
        ['Hey Marvin'],
        openingSentAt,
      );

      await expect(
        controller.chatHistory(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when conversation id does not exist', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);

      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      await expect(
        controller.chatHistory(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: 999999,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sentAt validation', () => {
    it('rejects SendTextMessageDto when sentAt is omitted', async () => {
      const dto = plainToInstance(SendTextMessageDto, {
        workspaceCode: '12er56',
        conversationId: 1,
        message: ['Hey buddy'],
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('sentAt');
    });

    it('rejects SendTextMessageDto when sentAt is in the future', async () => {
      const dto = plainToInstance(SendTextMessageDto, {
        workspaceCode: '12er56',
        conversationId: 1,
        message: ['Hey buddy'],
        sentAt: futureSentAt.toISOString(),
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('sentAt');
    });

    it('rejects CreateConversationDto when sentAt is omitted', async () => {
      const dto = plainToInstance(CreateConversationDto, {
        workspaceCode: '12er56',
        recipientTeammateId: 1,
        openingMessage: ['Hey buddy'],
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('sentAt');
    });

    it('rejects CreateConversationDto when sentAt is in the future', async () => {
      const dto = plainToInstance(CreateConversationDto, {
        workspaceCode: '12er56',
        recipientTeammateId: 1,
        openingMessage: ['Hey buddy'],
        sentAt: futureSentAt.toISOString(),
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('sentAt');
    });
  });
});
