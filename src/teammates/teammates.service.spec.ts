import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TeammatesService } from './teammates.service';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { createTestApp } from '@/test-helpers/test-app';
import Factory, { PersistStrategy } from '@/factories/factory';
import workspaceFactory from '@/factories/workspace.factory';
import { setupWorkspaceWithMultipleTeammates } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import RequestUser from '@/auth/domain/request-user';
import { TeammateStatus } from '@/generated/prisma/enums';
import { resetDb } from '@/test-helpers/rest-db';
import { TeammatesNotInSameWorkspace } from '@/common/exceptions/teammates-not-in-same-workspace';

describe('TeammatesService', () => {
  let requestUser: RequestUser;
  let service: TeammatesService;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useenvoye.com');

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    service = new TeammatesService(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('getTeammates', () => {
    it('should return no teammates for an empty workspace', async () => {
      const emptyWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
      const activeTeammates = await service.getTeammates(
        emptyWorkspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(activeTeammates).toMatchObject([]);
    });

    it('should return all active teammates', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });
      const marvin = teammates[1];
      const zuri = teammates[2];

      const activeTeammates = await service.getTeammates(
        koboMart.code,
        TeammateStatus.ACTIVE,
      );
      expect(activeTeammates).toHaveLength(3);
      expect(activeTeammates.map((teammate) => teammate.email)).toEqual(
        expect.arrayContaining([dan.email, marvin.email, zuri.email]),
      );
    });

    it('should not return deleted teammates', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });
      const pat = await factory.persist('teammate', () =>
        teammateFactory.build({
          workspaceCode: koboMart.code,
          status: TeammateStatus.DELETED,
        }),
      );

      const activeTeammates = await service.getTeammates(
        koboMart.code,
        TeammateStatus.ACTIVE,
      );
      expect(activeTeammates.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([pat.email]),
      );
    });

    it('should not return disabled teammates', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });
      const sam = await factory.persist('teammate', () =>
        teammateFactory.build({
          workspaceCode: koboMart.code,
          status: TeammateStatus.DISABLED,
        }),
      );

      const activeTeammates = await service.getTeammates(
        koboMart.code,
        TeammateStatus.ACTIVE,
      );
      expect(activeTeammates.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([sam.email]),
      );
    });

    it('should return only teammates with the right workspaceCode', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 3);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });

      const zuriBakeryTeammate = teammateFactory.build();
      await factory.persist('workspace', () =>
        workspaceFactory.build({
          code: zuriBakeryTeammate.workspaceCode,
          ownedById: 2,
        }),
      );
      await factory.persist('teammate', () => zuriBakeryTeammate);

      const activeTeammates = await service.getTeammates(
        koboMart.code,
        TeammateStatus.ACTIVE,
      );
      expect(activeTeammates.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([zuriBakeryTeammate.email]),
      );
    });
  });

  describe('getMyTeammateProfile', () => {
    it('should return correct teammate details for email and workspaceCode', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      const laura = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });

      const teammateProfile = await service.getMyTeammateProfile(
        koboMart.code,
        laura.email,
      );

      expect(teammateProfile).toMatchObject({
        id: laura.id,
        firstName: laura.firstName,
        lastName: laura.lastName,
        email: laura.email,
        status: laura.status,
        avatarUrl: laura.avatarUrl,
        groups: laura.groups,
      });
    });
  });

  describe('usernameAlreadyExistsInWorkspace', () => {
    it('should return true when a teammate with that username exists in the workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email, username: 'laura.smith' },
      });

      const usernameTaken = await service.usernameAlreadyExistsInWorkspace(
        koboMart.code,
        'laura.smith',
      );

      expect(usernameTaken).toBe(true);
    });

    it('should return false when no teammate with that username exists in the workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 1);
      await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email, username: 'laura.smith' },
      });

      const usernameTaken = await service.usernameAlreadyExistsInWorkspace(
        koboMart.code,
        'john.doe',
      );

      expect(usernameTaken).toBe(false);
    });
  });

  describe('runIfTeammatesInSameWorkspace', () => {
    it('runs the action when teammates share a workspace', async () => {
      const { workspace: koboMart, teammates } =
        await setupWorkspaceWithMultipleTeammates(factory, 2);
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });
      const marvin = teammates[1];

      const result = await service.runIfTeammatesInSameWorkspace(
        dan.id,
        [marvin.id],
        (anchorTeammateId, teammateIds, workspaceCode) => {
          expect(anchorTeammateId).toBe(dan.id);
          expect(teammateIds).toEqual([marvin.id]);
          expect(workspaceCode).toBe(koboMart.code);
          return Promise.resolve({ ok: true });
        },
      );

      expect(result).toEqual({ ok: true });
    });

    it('throws NotFoundInDb with missing teammate ids when a teammate does not exist', async () => {
      const { teammates } = await setupWorkspaceWithMultipleTeammates(
        factory,
        1,
      );
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });
      const missingTeammateId = 999999;

      await expect(
        service.runIfTeammatesInSameWorkspace(dan.id, [missingTeammateId], () =>
          Promise.resolve('should not run'),
        ),
      ).rejects.toThrow(
        `Teammate not found; missingTeammateIds=[${missingTeammateId}]`,
      );
    });

    it('throws TeammatesNotInSameWorkspace when teammates span multiple workspaces', async () => {
      const { teammates } = await setupWorkspaceWithMultipleTeammates(
        factory,
        1,
      );
      const dan = await prismaService.teammate.update({
        where: { id: teammates[0].id },
        data: { email: requestUser.email },
      });

      const zuriBakeryTeammate = teammateFactory.build();
      await factory.persist('workspace', () =>
        workspaceFactory.build({
          code: zuriBakeryTeammate.workspaceCode,
          ownedById: 2,
        }),
      );
      const marvinInZuriBakery = await factory.persist(
        'teammate',
        () => zuriBakeryTeammate,
      );

      await expect(
        service.runIfTeammatesInSameWorkspace(
          dan.id,
          [marvinInZuriBakery.id],
          () => Promise.resolve('should not run'),
        ),
      ).rejects.toThrow(TeammatesNotInSameWorkspace);
    });
  });
});
