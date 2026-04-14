import { Test, TestingModule } from '@nestjs/testing';
import { TeammatesService } from './teammates.service';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { createTestApp } from '@/test-helpers/test-app';
import Factory, { PersistStrategy } from '@/factories/factory';
import workspaceFactory from '@/factories/workspace.factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import RequestUser from '@/auth/domain/request-user';
import { TeammateStatus } from '@/generated/prisma/enums';
import { Teammate, Workspace } from '@/generated/prisma/client';

describe('TeammatesService', () => {
  let requestUser: RequestUser;
  let service: TeammatesService;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useenvoye.com');
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [TeammatesService],
    }).compile();
    app = await createTestApp(module);
    service = app.get<TeammatesService>(TeammatesService);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.workspace.deleteMany();
    await prismaService.companyProfile.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('getTeammates', () => {
    let workspace: Workspace;
    let firstTeammate: Teammate;
    let secondTeammate: Teammate;
    let thirdTeammate: Teammate;
    let fourthTeammate: Teammate;
    let fifthTeammate: Teammate;

    beforeEach(async () => {
      const setup = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: requestUser.email }),
      );
      workspace = setup.workspace;
      firstTeammate = setup.teammate;

      [secondTeammate, thirdTeammate, fourthTeammate, fifthTeammate] =
        await Promise.all([
          factory.persist('teammate', () =>
            teammateFactory.build({
              workspaceCode: workspace.code,
              status: TeammateStatus.ACTIVE,
            }),
          ),
          factory.persist('teammate', () =>
            teammateFactory.build({
              workspaceCode: workspace.code,
              status: TeammateStatus.ACTIVE,
            }),
          ),
          factory.persist('teammate', () =>
            teammateFactory.build({
              workspaceCode: workspace.code,
              status: TeammateStatus.DELETED,
            }),
          ),
          factory.persist('teammate', () =>
            teammateFactory.build({
              workspaceCode: workspace.code,
              status: TeammateStatus.DISABLED,
            }),
          ),
        ]);
    });

    it('should return no teammates for an empty workspace', async () => {
      const emptyWorkspace = await factory.persist('workspace', () =>
        workspaceFactory.envoyeWorkspace(),
      );
      const result = await service.getTeammates(
        emptyWorkspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(result).toMatchObject([]);
    });

    it('should return all active teammates', async () => {
      const result = await service.getTeammates(
        workspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(result).toHaveLength(3);
      expect(result.map((teammate) => teammate.email)).toEqual(
        expect.arrayContaining([
          firstTeammate.email,
          secondTeammate.email,
          thirdTeammate.email,
        ]),
      );
    });

    it('should not return deleted teammates', async () => {
      const result = await service.getTeammates(
        workspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(result.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([fourthTeammate.email]),
      );
    });

    it('should not return disabled teammates', async () => {
      const result = await service.getTeammates(
        workspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(result.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([fifthTeammate.email]),
      );
    });

    it('should return only teammates with the right workspaceCode', async () => {
      const anotherTeammate = teammateFactory.build();
      await factory.persist('workspace', () =>
        workspaceFactory.build({
          code: anotherTeammate.workspaceCode,
          ownedById: 2,
        }),
      );
      await factory.persist('teammate', () => anotherTeammate);

      const result = await service.getTeammates(
        workspace.code,
        TeammateStatus.ACTIVE,
      );
      expect(result.map((teammate) => teammate.email)).not.toEqual(
        expect.arrayContaining([anotherTeammate.email]),
      );
    });
  });

  describe('getMyTeammateProfile', () => {
    it('should return correct teammate details for email and workspaceCode', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: requestUser.email }),
      );

      const result = await service.getMyTeammateProfile(
        workspace.code,
        teammate.email,
      );

      expect(result).toMatchObject({
        id: teammate.id,
        firstName: teammate.firstName,
        lastName: teammate.lastName,
        email: teammate.email,
        status: teammate.status,
        avatarUrl: teammate.avatarUrl,
        groups: teammate.groups,
      });
    });
  });

  describe('usernameAlreadyExistsInWorkspace', () => {
    it('should return true when a teammate with that username exists in the workspace', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          username: 'laura.smith',
        }),
      );

      const result = await service.usernameAlreadyExistsInWorkspace(
        workspace.code,
        'laura.smith',
      );

      expect(result).toBe(true);
    });

    it('should return false when no teammate with that username exists in the workspace', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          username: 'laura.smith',
        }),
      );

      const result = await service.usernameAlreadyExistsInWorkspace(
        workspace.code,
        'john.doe',
      );

      expect(result).toBe(false);
    });
  });
});
