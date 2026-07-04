import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import { ConversationsService } from '@/conversations/conversations.service';
import { ConversationParticipantsSignature } from '@/backfill/tasks/participants-signature';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { createTestApp } from '@/test-helpers/test-app';
import { LinkService } from '@/common/link-service';
import { mockConfigService } from '@/test-helpers/mocks';
import { TestEmailClient } from '@/messaging/email/test-email-client';
import { resetDb } from '@/test-helpers/rest-db';
import { setupWorkspaceWithMultipleTeammates } from '@/test-helpers/workspace-helpers';
import { Conversation, Teammate } from '@/generated/prisma/client';

//TODO: add date added to backfill taks
describe(' Conversation Participant Signature Backfill Task', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let conversationService: ConversationsService;
  let service: ConversationParticipantsSignature;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    const linkService = new LinkService(mockConfigService);
    conversationService = new ConversationsService(
      prismaService,
      new TestEmailClient(),
      linkService,
    );
    service = new ConversationParticipantsSignature(
      prismaService,
      conversationService,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createConversationWithOwner(owner: Teammate) {
    const conversation = await prismaService.conversation.create({
      data: {
        workspaceCode: owner.workspaceCode,
      },
    });

    await prismaService.conversationParticipant.create({
      data: {
        workspaceCode: owner.workspaceCode,
        conversationId: conversation.id,
        teammateId: owner.id,
        isOwner: true,
      },
    });

    return conversation;
  }

  async function addOtherParticipants(
    conversation: Conversation,
    participants: Teammate[],
  ) {
    const data = participants.map((participant) => {
      return {
        workspaceCode: conversation.workspaceCode,
        conversationId: conversation.id,
        teammateId: participant.id,
      };
    });
    await prismaService.conversationParticipant.createMany({
      data: data,
    });
  }

  async function assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
    count: number,
    workspaceCode: string,
  ) {
    const conversations = await prismaService.conversation.findMany({
      where: { workspaceCode: workspaceCode },
    });

    expect(
      conversations.filter((c) => c.participantSignature === null).length,
    ).toBe(count);
  }

  test('it updates participant signature when only two participants', async () => {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      5,
    );

    const sammy = teammates[0];
    const derick = teammates[1];

    const conversation = await createConversationWithOwner(sammy);
    await addOtherParticipants(conversation, [derick]);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      1,
      workspace.code,
    );

    await service.run(workspace);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      0,
      workspace.code,
    );
  });

  it('updates participant signature when only one ', async () => {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      5,
    );

    const dammy = teammates[2];

    await createConversationWithOwner(dammy);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      1,
      workspace.code,
    );

    await service.run(workspace);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      0,
      workspace.code,
    );
  });

  it('does not backfill conversations with more than two participants', async () => {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      5,
    );

    const vivian = teammates[0];
    const joy = teammates[1];
    const tomi = teammates[2];

    const conversation = await createConversationWithOwner(vivian);
    await addOtherParticipants(conversation, [joy, tomi]);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      1,
      workspace.code,
    );

    await service.run(workspace);

    assertConversationWithMissingParticipantSignatureCountForWorkspaceIsExpectedNumber(
      1,
      workspace.code,
    );
  });
});
