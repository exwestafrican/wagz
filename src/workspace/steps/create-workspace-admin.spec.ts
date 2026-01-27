import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { CreateWorkspaceAdminStep } from '@/workspace/steps/create-workspace-admin';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import {
  CompanyProfile,
  PreVerification,
  Workspace,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';

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
    await app.close();
  });

  it('can create and roll back teammate creation', async () => {
    const workspaceDetails = await miniWorkspaceSetup(
      preVerificationFactory.build(),
    );
    await step.execute(workspaceDetails);

    expect(
      await prismaService.teammate.count({
        where: {
          email: workspaceDetails.pointOfContact.email,
        },
      }),
    ).toBe(1);

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
