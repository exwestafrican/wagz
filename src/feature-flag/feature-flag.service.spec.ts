import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import workspaceFactory from '@/factories/workspace.factory';
import { ENVOYE_WORKSPACE_CODE, ENVOYE_WORKSPACE_ID } from './const';
import companyProfileFactory from '@/factories/company-profile.factory';
import { PrismaService } from '@/prisma/prisma.service';
import FeatureFlagLoader from './service/feature-flag-loader';
import { TestFeatureFlagLoader } from './service/test-feature-flag-loader';
import { Workspace } from '@/generated/prisma/client';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let prismaService: PrismaService;
  let app: INestApplication;

  async function buildEnvoyeWorkspace(prismaService: PrismaService) {
    const companyProfile = await prismaService.companyProfile.create({
      data: companyProfileFactory.build({
        companyName: 'Envoye',
        domain: 'envoye.co',
      }),
    });

    const workspace = await prismaService.workspace.create({
      data: workspaceFactory.build({
        id: ENVOYE_WORKSPACE_ID,
        code: ENVOYE_WORKSPACE_CODE,
        name: companyProfile.companyName,
        ownedById: companyProfile.id,
      }),
    });

    return workspace;
  }

  async function buildWorkspace(prismaService: PrismaService) {
    const companyProfile = await prismaService.companyProfile.create({
      data: companyProfileFactory.build(),
    });

    const workspace = await prismaService.workspace.create({
      data: workspaceFactory.build({
        name: companyProfile.companyName,
        ownedById: companyProfile.id,
      }),
    });

    return workspace;
  }

  beforeEach(async () => {
    const featureFlagLoader: FeatureFlagLoader = new TestFeatureFlagLoader();
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [
        {
          provide: FeatureFlagService,
          useValue: new FeatureFlagService(featureFlagLoader),
        },
      ],
    }).compile();
    app = await createTestApp(module);
    service = app.get<FeatureFlagService>(FeatureFlagService);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });
  it('should return true for envoye workspace', async () => {
    const envoyeWorkspace: Workspace =
      await buildEnvoyeWorkspace(prismaService);
    expect(
      service.isEnabled('can_integrate_whatsapp', envoyeWorkspace.code),
    ).toBeTruthy();
  });

  it('should return false for non envoye workspace', async () => {
    const someOtherWorkspace = await buildWorkspace(prismaService);
    expect(
      service.isEnabled('can_integrate_whatsapp', someOtherWorkspace.code),
    ).toBeFalsy();
  });

  it('should list app features for envoye', async () => {
    const envoyeWorkspace: Workspace =
      await buildEnvoyeWorkspace(prismaService);
    expect(service.enabledFeatures(envoyeWorkspace.code)).toMatchObject([
      'can_integrate_whatsapp',
      'can_integrate_instagram',
      'can_integrate_gmail',
    ]);
  });

  it('should return an empty list for other workspaces', async () => {
    const someOtherWorkspace = await buildWorkspace(prismaService);
    expect(service.enabledFeatures(someOtherWorkspace.code)).toMatchObject([]);
  });
});
