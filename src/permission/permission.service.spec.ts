import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PrismaModule } from '@/prisma/prisma.module';
import Factory, { PersistStrategy } from '@/factories/factory';
import { PrismaService } from '@/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import workspaceFactory from '@/factories/workspace.factory';
import teammateFactory from '@/factories/teammate.factory';
import { Role } from './domain/role';
import { PERMISSIONS, ROLES } from './types';

describe('PermissionService', () => {
  let service: PermissionService;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PermissionService],
    }).compile();
    app = await createTestApp(module);
    service = module.get<PermissionService>(PermissionService);
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
  async function setupWorkspaceWithTeammate(
    factory: PersistStrategy,
    teammateRole: Role[],
  ) {
    const workspace = await factory.persist('workspace', () =>
      workspaceFactory.envoyeWorkspace(),
    );
    const teammate = await factory.persist('teammate', () =>
      teammateFactory.build({
        groups: teammateRole.map((role) => role.code),
        workspaceCode: workspace.code,
      }),
    );
    return teammate;
  }

  it('should return no permissions when teammate does not belong to any role', async () => {
    const teammate = await setupWorkspaceWithTeammate(factory, []);
    const result = await service.teammatePermissions(
      teammate.email,
      teammate.workspaceCode,
    );
    expect(result).toMatchObject([]);
  });

  describe('Teammate has single role', () => {
    test.each([
      {
        role: ROLES.WorkspaceAdmin,
        permissions: [
          PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
          PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
          PERMISSIONS.MESSAGE_TEAMMATES,
          PERMISSIONS.MANAGE_TEAMMATES,
          PERMISSIONS.MANAGE_CHANNELS,
        ],
      },
      {
        role: ROLES.SupportStaff,
        permissions: [
          PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
          PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
          PERMISSIONS.MESSAGE_TEAMMATES,
        ],
      },
      {
        role: ROLES.WorkspaceMember,
        permissions: [PERMISSIONS.MESSAGE_TEAMMATES],
      },
    ])(
      'return all permissions for teammates with $role role',
      async ({ role, permissions }) => {
        const teammate = await setupWorkspaceWithTeammate(factory, [role]);
        const result = await service.teammatePermissions(
          teammate.email,
          teammate.workspaceCode,
        );
        expect(result).toMatchObject(permissions);
      },
    );
  });

  // [WorkspaceAdmin] => [READ_SUPPORT_CONVERSATIONS, REPLY_SUPPORT_CONVERSATIONS, MANAGE_TEAMMATES, MANAGE_CHANNELS, MESSAGE_TEAMMATES]

  // [WorkspaceAdmin, SupportStaff] => [READ_SUPPORT_CONVERSATIONS, REPLY_SUPPORT_CONVERSATIONS, MANAGE_TEAMMATES, MANAGE_CHANNELS, MESSAGE_TEAMMATES]
});
