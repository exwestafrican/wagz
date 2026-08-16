import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/common/test-helpers/test-app';
import { CreateWorkspaceAdminStep } from '@/envoye/workspace/steps/create-workspace-admin';
import { WorkspaceDetails } from '@/envoye/workspace/domain/workspace-details';
import {
  CompanyProfile,
  PreVerification,
  Workspace,
} from '@/generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PointOfContact } from '@/envoye/workspace/domain/point-of-contact';
import preVerificationFactory from '@/common/factories/roadmap/preverification.factory';
import { resetDb } from '@/common/test-helpers/rest-db';

describe('CreateWorkspaceAdminStep', () => {
  let step: CreateWorkspaceAdminStep;
  let app: INestApplication;
  let prismaService: PrismaService;

  async function miniWorkspaceSetup(
    details: PreVerification,
  ): Promise<WorkspaceDetails> {
    const companyProfile: CompanyProfile =
      await prismaService.companyProfile.create({
        data: {
          companyName: details.companyName,
          pointOfContactEmail: details.email,
          phoneCountryCode: details.phoneCountryCode,
          phoneNumber: details.phoneNumber,
          preVerificationId: details.id,
        },
      });
    const workspace: Workspace = await prismaService.workspace.create({
      data: {
        name: companyProfile.companyName,
        ownedById: companyProfile.id,
        code: 'a3b9c2',
      },
    });
    return WorkspaceDetails.from(workspace, PointOfContact.from(details));
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    step = new CreateWorkspaceAdminStep(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('can create and roll back teammate creation', async () => {
    const preverificationData = preVerificationFactory.build({
      username: 'sam.davids',
    });

    await prismaService.preVerification.create({ data: preverificationData });
    const workspaceDetails = await miniWorkspaceSetup(preverificationData);
    await step.execute(workspaceDetails);

    const createdTeammate = await prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: {
          workspaceCode: workspaceDetails.code,
          email: workspaceDetails.pointOfContact.email,
        },
      },
    });

    expect(createdTeammate.username).toBe(preverificationData.username);
    expect(createdTeammate.normalizedUsername).toBe('samdavids');

    await step.compensate(workspaceDetails);

    expect(
      await prismaService.teammate.count({
        where: {
          email: workspaceDetails.pointOfContact.email,
        },
      }),
    ).toBe(0);
  });
});
