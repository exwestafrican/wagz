import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { OptIntoAdministrativeWorkspaceStep } from '@/workspace/steps/opt-into-administrative-workspace';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PrismaService } from '@/prisma/prisma.service';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import FeatureFlagManager from '@/feature-flag/manager';
import { FEATURE_ADMINISTRATIVE_WORKSPACE_KEY } from '@/feature-flag/const';
import { FeatureFlagStatus } from '@/generated/prisma/enums';
import Factory, { PersistStrategy } from '@/factories/factory';
import workspaceFactory from '@/factories/workspace.factory';

describe('OptIntoAdministrativeWorkspaceStep', () => {
  let step: OptIntoAdministrativeWorkspaceStep;
  let app: INestApplication;
  let prismaService: PrismaService;
  let featureFlagManager: FeatureFlagManager;
  let factory: PersistStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    featureFlagManager = new FeatureFlagManager(prismaService);
    step = new OptIntoAdministrativeWorkspaceStep(featureFlagManager);
    factory = Factory.createStrategy(prismaService);

    await prismaService.featureFlag.create({
      data: {
        key: FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
        name: 'Administrative workspace',
        description: 'Enables administrative workspace behavior',
        status: FeatureFlagStatus.PARTIAL,
        addedBy: 'test@example.com',
      },
    });
  });

  afterEach(async () => {
    await prismaService.workspaceFeature.deleteMany();
    await prismaService.teammate.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await prismaService.featureFlag.deleteMany();
    await app.close();
  });

  it('opts workspace into administrative workspace feature and compensates', async () => {
    const preVerification = preVerificationFactory.build();
    const workspace = await factory.persist('workspace', () =>
      workspaceFactory.build({ code: 'a3b9c2' }),
    );
    const workspaceDetails = WorkspaceDetails.from(
      workspace,
      PointOfContact.from(preVerification),
    );

    await expect(
      featureFlagManager.enabled(
        workspaceDetails.code,
        FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
      ),
    ).resolves.toBe(false);

    await step.execute(workspaceDetails);

    await expect(
      featureFlagManager.enabled(
        workspaceDetails.code,
        FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
      ),
    ).resolves.toBe(true);

    await step.compensate(workspaceDetails);

    await expect(
      featureFlagManager.enabled(
        workspaceDetails.code,
        FEATURE_ADMINISTRATIVE_WORKSPACE_KEY,
      ),
    ).resolves.toBe(false);

    expect(
      await prismaService.workspaceFeature.count({
        where: { workspaceCode: workspaceDetails.code },
      }),
    ).toBe(0);
  });
});
