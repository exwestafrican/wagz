import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import workspaceFactory from '@/factories/workspace.factory';
import { PrismaService } from '@/prisma/prisma.service';
import FeatureFlagLoader from './service/feature-flag-loader';
import { TestFeatureFlagLoader } from './service/test-feature-flag-loader';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import Factory from '@/factories/factory';
import { PersistStrategy } from '@/factories/factory';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let prismaService: PrismaService;
  let app: INestApplication;
  let factory: PersistStrategy;

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
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  it('should return true for envoye workspace', async () => {
    const envoyeWorkspace = await factory.persist('workspace', () => workspaceFactory.envoyeWorkspace());

    expect(
      service.isEnabled('can_integrate_whatsapp', envoyeWorkspace.code),
    ).toBeTruthy();
  });

  it('should return false for non envoye workspace', async () => {
    const someOtherWorkspace = await factory.persist('workspace', () =>
      workspaceFactory.build(),
    );
    expect(
      service.isEnabled('can_integrate_whatsapp', someOtherWorkspace.code),
    ).toBeFalsy();
  });

  it('should list app features for envoye', async () => {
    const envoyeWorkspace = await factory.persist('workspace', () =>
      workspaceFactory.envoyeWorkspace(),
    );
    expect(service.enabledFeatures(envoyeWorkspace.code)).toMatchObject([
      'can_integrate_whatsapp',
      'can_integrate_instagram',
      'can_integrate_gmail',
    ]);
  });

  it('should return an empty list for other workspaces', async () => {
    const someOtherWorkspace = await factory.persist('workspace', () =>
      workspaceFactory.build(),
    );
    expect(service.enabledFeatures(someOtherWorkspace.code)).toMatchObject([]);
  });
});
