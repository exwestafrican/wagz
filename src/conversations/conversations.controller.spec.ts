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

describe('ConversationsController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let controller: ConversationsController;
  let conversationsService: ConversationsService;

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
    const envoyeMessenger = new EnvoyeMessenger(prismaService);

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
        }),
      ).rejects.toThrow(NotFoundException);
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

      const conversation = await conversationsService.createDirectMessage(
        dan.id,
        marvin.id,
        koboMart.code,
      );

      await controller.sendTextMessage(requestUser, {
        workspaceCode: koboMart.code,
        conversationId: conversation.id,
        message: 'Hey buddy',
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
    });

    it('throws ForbiddenException when sender is not a participant', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);

      const nonParticipantSender = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: {
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        },
      });

      const dan = teammates[1];
      const marvin = teammates[2];

      const conversation = await conversationsService.createDirectMessage(
        dan.id,
        marvin.id,
        koboMart.code,
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
          message: 'Hey buddy',
        }),
      ).rejects.toThrow(ForbiddenException);
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

      const conversation = await conversationsService.createDirectMessage(
        dan.id,
        marvin.id,
        koboMart.code,
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: '345dv5',
          conversationId: conversation.id,
          message: 'Hey buddy',
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

      const conversation = await conversationsService.createDirectMessage(
        dan.id,
        marvin.id,
        koboMart.code,
      );

      await expect(
        controller.sendTextMessage(requestUser, {
          workspaceCode: koboMart.code,
          conversationId: conversation.id,
          message: 'Hey buddy',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when conversation id does not exist', async () => {
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
          message: 'Hey buddy',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
