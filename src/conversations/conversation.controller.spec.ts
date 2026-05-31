import { ConversationsController } from './conversations.controller';
import RequestUser from '@/auth/domain/request-user';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import { ConversationsService } from './conversations.service';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import request from 'supertest';
import getHttpServer from '@/test-helpers/get-http-server';
import { ConversationEndpoints } from '@/common/const';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { Teammate, Workspace } from '@/generated/prisma/client';

describe('ConversationsController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  let workspace: Workspace;
  let sender: Teammate;
  let recipient: Teammate;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.com');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [ConversationsController],
      providers: [ConversationsService],
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
  });

  afterEach(async () => {
    await prismaService.conversationParticipant.deleteMany();
    await prismaService.conversation.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.workspace.deleteMany();
    await app.close();
  });

  it('should create a conversation with sender and recipient participants', async () => {
    const response = await request(getHttpServer(app))
      .post(ConversationEndpoints.CREATE_CONVERSATION)
      .send({
        workspaceCode: workspace.code,
        customerInfo: 'john@acme.com',
        subject: 'Billing issue',
        recipientTeammateId: recipient.id,
      })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.CREATED);

    const body = response.body as ConversationResponseDto;
    expect(body.id).toEqual(expect.any(Number));

    const conversation = await prismaService.conversation.findUnique({
      where: { id: body.id },
    });
    expect(conversation).toMatchObject({
      workspaceCode: workspace.code,
      customerInfo: 'john@acme.com',
      subject: 'Billing issue',
    });

    const participants = await prismaService.conversationParticipant.findMany({
      where: { conversationId: body.id },
    });
    expect(participants).toHaveLength(2);
    expect(participants.map((participant) => participant.teammateId)).toEqual(
      expect.arrayContaining([sender.id, recipient.id]),
    );
  });

  it('should return 401 when there is no auth token', async () => {
    await request(getHttpServer(app))
      .post(ConversationEndpoints.CREATE_CONVERSATION)
      .send({
        workspaceCode: workspace.code,
        customerInfo: 'john@acme.com',
        subject: 'Billing issue',
        recipientTeammateId: recipient.id,
      })
      .set('Accept', 'application/json')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
