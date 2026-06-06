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
import { TeammatesService } from '@/teammates/teammates.service';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import workspaceFactory from '@/factories/workspace.factory';
import { Teammate, Workspace } from '@/generated/prisma/client';
import { resetDb } from '@/test-helpers/rest-db';
import { ROLES } from '@/permission/types';
import { TeammateStatus } from '@/generated/prisma/enums';

describe('ConversationsController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let controller: ConversationsController;

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
    const conversationsService = new ConversationsService(prismaService);
    const teammatesService = new TeammatesService(prismaService);
    const permissionService = new PermissionService(prismaService, roleService);

    controller = new ConversationsController(
      conversationsService,
      teammatesService,
      permissionService,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('createDirectMessage', () => {
    let workspace: Workspace;
    let senderTeammate: Teammate;
    let recipientTeammate: Teammate;

    beforeEach(async () => {
      const setup = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          groups: [ROLES.WorkspaceMember.code],
        }),
      );
      workspace = setup.workspace;
      senderTeammate = setup.teammate;

      recipientTeammate = await factory.persist('teammate', () =>
        teammateFactory.build({
          workspaceCode: workspace.code,
          status: TeammateStatus.ACTIVE,
        }),
      );
    });

    it('creates a direct message conversation when sender DMs a teammate in the same workspace', async () => {
      const body = await controller.createDirectMessage(requestUser, {
        workspaceCode: workspace.code,
        recipientTeammateId: recipientTeammate.id,
      });

      expect(body.workspaceCode).toBe(workspace.code);

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: body.id },
        },
      );
      expect(participants).toHaveLength(2);
      expect(participants.map((participant) => participant.teammateId)).toEqual(
        expect.arrayContaining([senderTeammate.id, recipientTeammate.id]),
      );
    });

    it('creates a self-conversation when sender DMs themselves', async () => {
      const body = await controller.createDirectMessage(requestUser, {
        workspaceCode: workspace.code,
        recipientTeammateId: senderTeammate.id,
      });

      expect(body.workspaceCode).toBe(workspace.code);

      const participants = await prismaService.conversationParticipant.findMany(
        {
          where: { conversationId: body.id },
        },
      );
      expect(participants).toHaveLength(1);
      expect(participants[0].teammateId).toBe(senderTeammate.id);
      expect(participants[0].isOwner).toBe(true);
    });

    it('throws BadRequestException when recipient is in a different workspace', async () => {
      const otherWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.build(),
      );
      const teammateInOtherWorkspace = await factory.persist('teammate', () =>
        teammateFactory.build({ workspaceCode: otherWorkspace.code }),
      );

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: workspace.code,
          recipientTeammateId: teammateInOtherWorkspace.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when sender is not an active member of the workspace', async () => {
      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: '345dv5',
          recipientTeammateId: recipientTeammate.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when sender lacks message_teammates permission', async () => {
      await resetDb(prismaService);

      const setupWithoutPermission = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          groups: [],
        }),
      );

      const teammateInWorkspace = await factory.persist('teammate', () =>
        teammateFactory.build({
          workspaceCode: setupWithoutPermission.workspace.code,
          status: TeammateStatus.ACTIVE,
        }),
      );

      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: setupWithoutPermission.workspace.code,
          recipientTeammateId: teammateInWorkspace.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when recipient teammate id does not exist', async () => {
      await expect(
        controller.createDirectMessage(requestUser, {
          workspaceCode: workspace.code,
          recipientTeammateId: 999999,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
