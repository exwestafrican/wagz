import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import RequestUser from '@/auth/domain/request-user';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import request from 'supertest';
import getHttpServer from '@/test-helpers/get-http-server';
import { ConversationEndpoints } from '@/common/const';
import { MessageResponseDto } from './dto/message-response.dto';
import { Conversation, Teammate, Workspace } from '@/generated/prisma/client';

describe('MessagesController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  let workspace: Workspace;
  let sender: Teammate;
  let recipient: Teammate;
  let conversation: Conversation;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.com');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [MessagesController],
      providers: [MessagesService],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);

    const setup = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({ email: requestUser.email }),
    );
    workspace = setup.workspace;
    sender = setup.teammate;
    recipient = await factory.persist('teammate', () =>
      teammateFactory.build({ workspaceCode: workspace.code }),
    );

    conversation = await prismaService.conversation.create({
      data: {
        workspaceCode: workspace.code,
        subject: 'Billing issue',
      },
    });
    await prismaService.conversationParticipant.createMany({
      data: [
        {
          workspaceCode: workspace.code,
          conversationId: conversation.id,
          teammateId: sender.id,
          isOwner: true,
        },
        {
          workspaceCode: workspace.code,
          conversationId: conversation.id,
          teammateId: recipient.id,
        },
      ],
    });
  });

  afterEach(async () => {
    await prismaService.message.deleteMany();
    await prismaService.conversationParticipant.deleteMany();
    await prismaService.conversation.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.workspace.deleteMany();
    await app.close();
  });

  it('should send a message and update conversation and read pointers', async () => {
    const response = await request(getHttpServer(app))
      .post(ConversationEndpoints.SEND_MESSAGE(conversation.id))
      .send({ content: 'Hello there' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.CREATED);

    const body = response.body as MessageResponseDto;
    expect(body).toMatchObject({
      id: expect.any(Number),
      conversationId: conversation.id,
      content: 'Hello there',
      senderTeammateId: sender.id,
      messagetype: 'TEXT',
    });

    const message = await prismaService.message.findUnique({
      where: { id: body.id },
    });
    expect(message).toMatchObject({
      workspaceCode: workspace.code,
      conversationId: conversation.id,
      content: 'Hello there',
      senderTeammateId: sender.id,
    });

    const updatedConversation = await prismaService.conversation.findUnique({
      where: { id: conversation.id },
    });
    expect(updatedConversation?.lastMessage).toEqual(body.id);

    const senderParticipant =
      await prismaService.conversationParticipant.findFirst({
        where: { conversationId: conversation.id, teammateId: sender.id },
      });
    expect(senderParticipant?.lastReadMessage).toEqual(body.id);
  });

  it('should return 403 when the sender is not a participant', async () => {
    const outsider = await factory.persist('teammate', () =>
      teammateFactory.build({ workspaceCode: workspace.code }),
    );
    const outsiderConversation = await prismaService.conversation.create({
      data: { workspaceCode: workspace.code, subject: 'Other' },
    });
    await prismaService.conversationParticipant.create({
      data: {
        workspaceCode: workspace.code,
        conversationId: outsiderConversation.id,
        teammateId: outsider.id,
        isOwner: true,
      },
    });

    // requestUser (laura) is NOT a participant of outsiderConversation
    await request(getHttpServer(app))
      .post(ConversationEndpoints.SEND_MESSAGE(outsiderConversation.id))
      .send({ content: 'Let me in' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.FORBIDDEN);
  });

  it('should return 404 when the conversation does not exist', async () => {
    await request(getHttpServer(app))
      .post(ConversationEndpoints.SEND_MESSAGE(999999))
      .send({ content: 'Anyone home?' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.NOT_FOUND);
  });

  it('should return 401 when there is no auth token', async () => {
    await request(getHttpServer(app))
      .post(ConversationEndpoints.SEND_MESSAGE(conversation.id))
      .send({ content: 'Hello there' })
      .set('Accept', 'application/json')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should return 400 when content is empty', async () => {
    await request(getHttpServer(app))
      .post(ConversationEndpoints.SEND_MESSAGE(conversation.id))
      .send({ content: '' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.BAD_REQUEST);
  });
});
