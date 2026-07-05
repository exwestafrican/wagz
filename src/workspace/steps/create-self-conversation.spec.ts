import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { CreateSelfConversationStep } from '@/workspace/steps/create-self-conversation';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import { setupWorkspaceWithMultipleTeammates } from '@/test-helpers/workspace-helpers';
import { resetDb } from '@/test-helpers/rest-db';
import Factory, { PersistStrategy } from '@/factories/factory';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { ConversationsService } from '@/conversations/conversations.service';
import { LinkService } from '@/common/link-service';
import { MessagingModule } from '@/messaging/messaging.module';

describe('CreateSelfConversationStep', () => {
  let step: CreateSelfConversationStep;
  let app: INestApplication;
  let prismaService: PrismaService;
  let messenger: EnvoyeMessenger;
  let factory: PersistStrategy;

  async function miniWorkspaceWithAdmin(): Promise<WorkspaceDetails> {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      1,
    );
    const [owner] = teammates;
    return WorkspaceDetails.from(
      workspace,
      new PointOfContact(owner.firstName, owner.lastName, owner.email),
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, MessagingModule],
      providers: [EnvoyeMessenger, ConversationsService, LinkService],
    }).compile();
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    messenger = app.get<EnvoyeMessenger>(EnvoyeMessenger);
    step = new CreateSelfConversationStep(messenger, prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('creates a self-conversation for the admin and rolls it back', async () => {
    const workspaceDetails = await miniWorkspaceWithAdmin();

    await step.execute(workspaceDetails);

    const admin = await prismaService.teammate.findFirstOrThrow({
      where: {
        workspaceCode: workspaceDetails.code,
        email: workspaceDetails.pointOfContact.email,
      },
    });
    const participants = await prismaService.conversationParticipant.findMany({
      where: { workspaceCode: workspaceDetails.code, teammateId: admin.id },
    });
    expect(participants).toHaveLength(1);
    expect(participants[0].isOwner).toBe(true);

    await step.compensate(workspaceDetails);

    expect(
      await prismaService.conversation.count({
        where: { workspaceCode: workspaceDetails.code },
      }),
    ).toBe(0);
  });

  it('compensate is a no-op when execute did not run', async () => {
    const workspaceDetails = await miniWorkspaceWithAdmin();
    await expect(step.compensate(workspaceDetails)).resolves.not.toThrow();
  });

  it('only removes conversation for current workspace', async () => {
    const { workspace, teammates } = await setupWorkspaceWithMultipleTeammates(
      factory,
      2,
    );
    const [laura, tumise] = teammates;
    await messenger.sendOpeningTextMessage(
      laura.id,
      [tumise.id],
      workspace.code,
      [],
      new Date(),
    );

    const workspaceDetails = await miniWorkspaceWithAdmin();

    await step.execute(workspaceDetails);
    await step.compensate(workspaceDetails);

    expect(
      await prismaService.conversation.count({
        where: { workspaceCode: workspaceDetails.code },
      }),
    ).toBe(0);

    expect(await prismaService.conversation.count()).toBe(1);
  });
});
