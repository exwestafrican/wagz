import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { CreateSelfConversationStep } from '@/workspace/steps/create-self-conversation';
import { ConversationsService } from '@/conversations/conversations.service';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import { CompanyProfile, PreVerification, Workspace } from '@/generated/prisma/client';

describe('CreateSelfConversationStep', () => {
  let step: CreateSelfConversationStep;
  let app: INestApplication;
  let prismaService: PrismaService;
  let conversationsService: ConversationsService;

  async function miniWorkspaceWithAdmin(
    details: PreVerification,
  ): Promise<WorkspaceDetails> {
    const companyProfile: CompanyProfile =
      await prismaService.companyProfile.create({
        data: {
          companyName: details.companyName,
          pointOfContactEmail: details.email,
          phoneCountryCode: details.phoneCountryCode,
          phoneNumber: details.phoneNumber,
        },
      });
    const workspace: Workspace = await prismaService.workspace.create({
      data: {
        name: companyProfile.companyName,
        ownedById: companyProfile.id,
        code: 'a3b9c2',
      },
    });
    await prismaService.teammate.create({
      data: {
        email: details.email,
        firstName: details.firstName,
        lastName: details.lastName,
        username: `${details.firstName.toLowerCase()}.${details.lastName.toLowerCase()}`,
        workspaceCode: workspace.code,
      },
    });
    return WorkspaceDetails.from(workspace, PointOfContact.from(details));
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [ConversationsService],
    }).compile();
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    conversationsService = app.get<ConversationsService>(ConversationsService);
    step = new CreateSelfConversationStep(conversationsService, prismaService);
  });

  afterEach(async () => {
    await prismaService.conversation.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  it('creates a self-conversation for the admin and rolls it back', async () => {
    const workspaceDetails = await miniWorkspaceWithAdmin(
      preVerificationFactory.build(),
    );

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
    const workspaceDetails = await miniWorkspaceWithAdmin(
      preVerificationFactory.build(),
    );
    await expect(step.compensate(workspaceDetails)).resolves.not.toThrow();
  });
});
