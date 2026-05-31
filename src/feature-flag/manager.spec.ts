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
import NotFoundInDb from '@/common/exceptions/not-found';
import CompanyProfileFactory from '@/factories/company-profile.factory';

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
    const featureFlag = await featureFlagManager.create(
      'created_via_manager',
      'Created flag',
      'Test description',
      'creator@example.com',
    );

    expect(featureFlag.status).toBe(FeatureFlagStatus.DISABLED);
    expect(featureFlag.addedBy).toBe('creator@example.com');
    expect(featureFlag.key).toBe('created_via_manager');
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

    await featureFlagManager.enableFF(koboMart.code, featureFlag.key);

    await expectFeatureEnabled(koboMart.code, featureFlag.key);
    await expectFeatureDisabled(zuriBakery.code, featureFlag.key);
  });

  it('turnOff throws when flag is globally enabled', async () => {
    const workspace = await createWorkspace();
    const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);
    await featureFlagManager.turnOnFFGlobally(featureFlag.key);

    await expect(
      featureFlagManager.disableFF(workspace.code, featureFlag.key),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only features enabled for user workspace', async () => {
    const koboMart = await createWorkspace();
    const zuriBakery = await createWorkspace();

    const globalFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);
    const partialFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);
    const disabledFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

    await featureFlagManager.turnOnFFGlobally(globalFlag.key);
    await featureFlagManager.enableFF(koboMart.code, partialFlag.key);

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

  describe('setStatus', () => {
    it('sets GLOBAL and enables for every workspace', async () => {
      const koboMart = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

      const updated = await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.GLOBAL,
      );

      expect(updated.status).toBe(FeatureFlagStatus.GLOBAL);
      await expectFeatureEnabled(koboMart.code, featureFlag.key);
    });

    it('sets DISABLED and disables for every workspace', async () => {
      const koboMart = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

      await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.GLOBAL,
      );
      const updated = await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.DISABLED,
      );

      expect(updated.status).toBe(FeatureFlagStatus.DISABLED);
      await expectFeatureDisabled(koboMart.code, featureFlag.key);
    });

    it('sets PARTIAL with no workspace added', async () => {
      const koboMart = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

      const updated = await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.PARTIAL,
      );

      expect(updated.status).toBe(FeatureFlagStatus.PARTIAL);
      await expectFeatureDisabled(koboMart.code, featureFlag.key);
    });

    it('is idempotent when status unchanged', async () => {
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

      const first = await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.PARTIAL,
      );
      const second = await featureFlagManager.setStatus(
        featureFlag.key,
        FeatureFlagStatus.PARTIAL,
      );

      expect(second.status).toBe(FeatureFlagStatus.PARTIAL);
      expect(second.id).toBe(first.id);
    });
  });

  describe('delete', () => {
    it('removes the feature flag from the database', async () => {
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

      const deleted = await featureFlagManager.delete(featureFlag.key);

      expect(deleted.key).toBe(featureFlag.key);
      await expect(
        prismaService.featureFlag.findFirst({
          where: { key: featureFlag.key },
        }),
      ).resolves.toBeNull();
      await expect(featureFlagManager.listAll()).resolves.not.toContainEqual(
        expect.objectContaining({ key: featureFlag.key }),
      );
    });

    it('throws NotFoundInDb for unknown key', async () => {
      await expect(
        featureFlagManager.delete('nonexistent_flag'),
      ).rejects.toBeInstanceOf(NotFoundInDb);
    });
  });

  describe('enableFFForApps', () => {
    it('enables the flag for each app when status is PARTIAL', async () => {
      const koboMart = await createWorkspace();
      const zuriBakery = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

      await featureFlagManager.enableFFForApps(featureFlag.key, [
        koboMart.code,
        zuriBakery.code,
      ]);

      await expectFeatureEnabled(koboMart.code, featureFlag.key);
      await expectFeatureEnabled(zuriBakery.code, featureFlag.key);
    });

    it('is idempotent when apps are already enabled', async () => {
      const workspace = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

      await featureFlagManager.enableFFForApps(featureFlag.key, [
        workspace.code,
      ]);
      await featureFlagManager.enableFFForApps(featureFlag.key, [
        workspace.code,
      ]);

      await expectFeatureEnabled(workspace.code, featureFlag.key);
      const persistedFeatureFlag =
        await prismaService.featureFlag.findFirstOrThrow({
          where: { key: featureFlag.key },
        });
      const enabledWorkspaceFeatures =
        await prismaService.workspaceFeature.findMany({
          where: {
            featureFlagId: persistedFeatureFlag.id,
            workspaceCode: workspace.code,
          },
        });
      expect(enabledWorkspaceFeatures).toHaveLength(1);
    });

    it('throws NotFoundInDb for unknown feature key', async () => {
      const workspace = await createWorkspace();

      await expect(
        featureFlagManager.enableFFForApps('nonexistent_flag', [
          workspace.code,
        ]),
      ).rejects.toBeInstanceOf(NotFoundInDb);
    });

    it('skips unknown app codes and enables valid ones', async () => {
      const zurich = await createWorkspace();
      const fabLabs = await createWorkspace();
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

      await featureFlagManager.enableFFForApps(featureFlag.key, [
        zurich.code,
        '000000',
        fabLabs.code,
      ]);

      await expectFeatureEnabled(zurich.code, featureFlag.key);
      await expectFeatureEnabled(fabLabs.code, featureFlag.key);
    });
  });

  describe('appsWithFeatureEnabled', () => {
    it('returns enrolled apps for PARTIAL flag', async () => {
      const koboMart = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Kobo Mart' }),
      );
      const zuriBakery = await factory.persist('workspace', () =>
        workspaceFactory.build({ name: 'Zuri Bakery' }),
      );
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.PARTIAL);

      await featureFlagManager.enableFFForApps(featureFlag.key, [
        koboMart.code,
        zuriBakery.code,
      ]);

      const enabledWorkspaces = await featureFlagManager.appsWithFeatureEnabled(
        featureFlag.key,
      );

      expect(enabledWorkspaces).toHaveLength(2);
      expect(enabledWorkspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: koboMart.id,
            code: koboMart.code,
            name: 'Kobo Mart',
          }),
          expect.objectContaining({
            id: zuriBakery.id,
            code: zuriBakery.code,
            name: 'Zuri Bakery',
          }),
        ]),
      );
    });

    it('returns up to 100 apps for GLOBAL flag', async () => {
      const companyProfile = await factory.persist('companyProfile', () =>
        CompanyProfileFactory.build(),
      );
      await prismaService.workspace.createMany({
        data: workspaceFactory.buildList(200, { ownedById: companyProfile.id }),
      });
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);
      await featureFlagManager.turnOnFFGlobally(featureFlag.key);

      const enabledWorkspaces = await featureFlagManager.appsWithFeatureEnabled(
        featureFlag.key,
      );

      expect(enabledWorkspaces).toHaveLength(100);
    });

    it('returns empty array for DISABLED flag', async () => {
      const featureFlag = await createFeatureFlag(FeatureFlagStatus.DISABLED);

      const enabledWorkspaces = await featureFlagManager.appsWithFeatureEnabled(
        featureFlag.key,
      );

      expect(enabledWorkspaces).toEqual([]);
    });

    it('throws NotFoundInDb for unknown key', async () => {
      await expect(
        featureFlagManager.appsWithFeatureEnabled('nonexistent_flag'),
      ).rejects.toBeInstanceOf(NotFoundInDb);
    });
  });
});
