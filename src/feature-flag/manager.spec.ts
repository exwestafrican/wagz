import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  INestApplication,
} from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import workspaceFactory from '@/factories/workspace.factory';
import featureFlagFactory from '@/factories/feature-flag.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import Factory, { PersistStrategy } from '@/factories/factory';
import FeatureFlagManager from '@/feature-flag/manager';
import { FeatureFlagStatus } from '@/generated/prisma/enums';

describe('FeatureFlagManager', () => {
  let featureFlagManager: FeatureFlagManager;
  let prismaService: PrismaService;
  let app: INestApplication;
  let factory: PersistStrategy;

  async function createWorkspace() {
    return await factory.persist('workspace', () => workspaceFactory.build());
  }

  async function createFeatureFlag(status: FeatureFlagStatus) {
    const featureFlag = featureFlagFactory.build({ status });
    await factory.persist('featureFlag', () => featureFlag);
    return featureFlag;
  }

  async function expectFeatureEnabled(workspaceCode: string, key: string) {
    await expect(featureFlagManager.enabled(workspaceCode, key)).resolves.toBe(
      true,
    );
  }

  async function expectFeatureDisabled(workspaceCode: string, key: string) {
    await expect(featureFlagManager.enabled(workspaceCode, key)).resolves.toBe(
      false,
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [FeatureFlagManager],
    }).compile();
    app = await createTestApp(module);
    featureFlagManager = app.get<FeatureFlagManager>(FeatureFlagManager);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.preVerification.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await prismaService.workspaceFeature.deleteMany();
    await prismaService.featureFlag.deleteMany();

    await app.close();
  });

  it('create persists disabled flag with addedBy', async () => {
    const row = await featureFlagManager.create(
      'created_via_manager',
      'Created flag',
      'Test description',
      'creator@example.com',
    );

    expect(row.status).toBe(FeatureFlagStatus.DISABLED);
    expect(row.addedBy).toBe('creator@example.com');
    expect(row.key).toBe('created_via_manager');
  });

  it('create throws ConflictException on duplicate key', async () => {
    const existing = await createFeatureFlag(FeatureFlagStatus.DISABLED);

    await expect(
      featureFlagManager.create(
        existing.key,
        'Another name',
        'Another description',
        'other@example.com',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('turnOnGlobally enables the flag for every workspace', async () => {
    const koboMart = await createWorkspace();
    const zuriBakery = await createWorkspace();
    const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

    await featureFlagManager.turnOnFFGlobally(featureFlag.key);

    await expectFeatureEnabled(koboMart.code, featureFlag.key);
    await expectFeatureEnabled(zuriBakery.code, featureFlag.key);

    const row = await prismaService.featureFlag.findFirstOrThrow({
      where: { key: featureFlag.key },
    });
    expect(row.status).toBe(FeatureFlagStatus.GLOBAL);
    expect(row.enabledAt).not.toBeNull();
  });

  it('turnOffGlobally makes enabled false for all workspaces and clears enabledAt', async () => {
    const koboMart = await createWorkspace();
    const zuriBakery = await createWorkspace();
    const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

    await featureFlagManager.turnOnFFGlobally(featureFlag.key);
    await featureFlagManager.turnOffGlobally(featureFlag.key);

    await expectFeatureDisabled(koboMart.code, featureFlag.key);
    await expectFeatureDisabled(zuriBakery.code, featureFlag.key);

    const row = await prismaService.featureFlag.findFirstOrThrow({
      where: { key: featureFlag.key },
    });
    expect(row.status).toBe(FeatureFlagStatus.DISABLED);
    expect(row.enabledAt).toBeNull();
  });

  it('turnOn enables the flag only for the given workspace (PARTIAL)', async () => {
    const koboMart = await createWorkspace();
    const zuriBakery = await createWorkspace();
    const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

    await featureFlagManager.turnOnFF(koboMart.code, featureFlag.key);

    await expectFeatureEnabled(koboMart.code, featureFlag.key);
    await expectFeatureDisabled(zuriBakery.code, featureFlag.key);
  });

  it('turnOff throws when flag is globally enabled', async () => {
    const workspace = await createWorkspace();
    const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);
    await featureFlagManager.turnOnFFGlobally(featureFlag.key);

    await expect(
      featureFlagManager.turnOff(workspace.code, featureFlag.key),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only features enabled for user workspace', async () => {
    const koboMart = await createWorkspace();
    const zuriBakery = await createWorkspace();

    const globalFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);
    const partialFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);
    const disabledFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

    await featureFlagManager.turnOnFFGlobally(globalFlag.key);
    await featureFlagManager.turnOnFF(koboMart.code, partialFlag.key);

    const koboMartFeatures = await featureFlagManager.enabledFFs(koboMart.code);
    expect(koboMartFeatures.length).toBe(2);
    expect(koboMartFeatures).toMatchObject([partialFlag.key, globalFlag.key]);

    const zuriBakeryFeatures = await featureFlagManager.enabledFFs(
      zuriBakery.code,
    );
    expect(zuriBakeryFeatures).toEqual([globalFlag.key]);

    expect(koboMartFeatures).not.toContain(disabledFlag.key);
    expect(zuriBakeryFeatures).not.toContain(partialFlag.key);
  });
});
