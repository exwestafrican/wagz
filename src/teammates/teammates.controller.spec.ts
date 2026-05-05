import { TeammatesController } from './teammates.controller';
import RequestUser from '@/auth/domain/request-user';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import { TeammatesService } from '@/teammates/teammates.service';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { TeammateResponseDto } from '@/teammates/dto/teammate-response.dto';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { TeammateStatus } from '@/generated/prisma/enums';
import request from 'supertest';
import getHttpServer from '@/test-helpers/get-http-server';
import { TeammatesEndpoints } from '@/common/const';
import { Teammate, Workspace } from '@/generated/prisma/client';

describe('TeammatesController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.com');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [TeammatesController],
      providers: [TeammatesService, PermissionService, RoleService],
    }).with(requestUser);
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await prismaService.teammate.deleteMany();
    await prismaService.workspace.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  describe('getActiveTeammates', () => {
    let workspace: Workspace;
    let firstTeammate: Teammate;
    let secondTeammate: Teammate;
    let thirdTeammate: Teammate;

    beforeEach(async () => {
      const setup = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: requestUser.email }),
      );

      workspace = setup.workspace;
      firstTeammate = setup.teammate;
      [secondTeammate, thirdTeammate] = await Promise.all([
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
      ]);
    });
    it('should return 200 with correct teammates', async () => {
      const response = await request(getHttpServer(app))
        .get(TeammatesEndpoints.TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      const body = response.body as TeammateResponseDto[];
      expect(body).toHaveLength(3);
      expect(body.map((teammate) => teammate.email)).toEqual(
        expect.arrayContaining([
          firstTeammate.email,
          secondTeammate.email,
          thirdTeammate.email,
        ]),
      );
    });

    it('should return 401 when there is no auth token', async () => {
      await request(getHttpServer(app))
        .get(TeammatesEndpoints.TEAMMATES)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 403 when caller is not in the workspace', async () => {
      await request(getHttpServer(app))
        .get(TeammatesEndpoints.TEAMMATES)
        .query({ workspaceCode: '345dv5' })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('getMyTeammateProfile', () => {
    it('should return 200 with correct teammate', async () => {
      const { workspace, teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({ email: requestUser.email }),
      );

      const response = await request(getHttpServer(app))
        .get(TeammatesEndpoints.MY_PROFILE)
        .query({ workspaceCode: workspace.code })
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .expect(HttpStatus.OK);

      const body = response.body as TeammateResponseDto;
      expect(body.email).toBe(teammate.email);
      expect(body.id).toBe(teammate.id);
    });

    it('should return 401 when there is no auth token', async () => {
      await request(getHttpServer(app))
        .get(TeammatesEndpoints.MY_PROFILE)
        .query({ workspaceCode: 'abc123' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('checkIfUsernameExists', () => {
    it('should return 200 when the username is available in the workspace', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          username: 'laura.smith',
        }),
      );

      await request(getHttpServer(app))
        .get(TeammatesEndpoints.CHECK_USERNAME)
        .query({ workspaceCode: workspace.code, username: 'john.doe' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.OK);
    });

    it('should return 409 when the username is already taken in the workspace', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: requestUser.email,
          username: 'laura.smith',
        }),
      );

      await request(getHttpServer(app))
        .get(TeammatesEndpoints.CHECK_USERNAME)
        .query({ workspaceCode: workspace.code, username: 'laura.smith' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.CONFLICT);
    });

    test.each([
      ['90-...jky', 'starts with digit and has consecutive separators'],
      ['laura smith', 'contains a space'],
      ['laura@smith', 'contains @'],
      ['1laura', 'starts with a digit'],
      ['.laura', 'has a leading separator'],
      ['laura.', 'has a trailing separator'],
      ['laura..smith', 'has consecutive separators'],
      ['_laura', 'has a leading separator'],
      ['laura!', 'has a disallowed special character'],
      ['a', 'is shorter than the minimum length'],
    ])(
      'should return 400 when the username %s is invalid (%s)',
      async (username: string) => {
        await request(getHttpServer(app))
          .get(TeammatesEndpoints.CHECK_USERNAME)
          .query({ workspaceCode: 'a1b2c3', username })
          .set('Accept', 'application/json')
          .expect(HttpStatus.BAD_REQUEST);
      },
    );
  });
});
