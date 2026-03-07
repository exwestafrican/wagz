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
import { RoleService } from './role/role.service';
import { Permission } from './domain/permission';

describe('PermissionService', () => {
  let service: PermissionService;
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let roleService: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PermissionService, RoleService],
    }).compile();
    app = await createTestApp(module);
    service = app.get<PermissionService>(PermissionService);
    roleService = app.get<RoleService>(RoleService);
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
    teammateRole: string[],
  ) {
    const workspace = await factory.persist('workspace', () =>
      workspaceFactory.envoyeWorkspace(),
    );
    const teammate = await factory.persist('teammate', () =>
      teammateFactory.build({
        groups: teammateRole,
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
        const teammate = await setupWorkspaceWithTeammate(factory, [role.code]);
        const result = await service.teammatePermissions(
          teammate.email,
          teammate.workspaceCode,
        );
        const expectedPermissionCodes = permissions.map(
          (permission) => permission.code,
        );
        expect(result).toEqual(expectedPermissionCodes);
      },
    );
  });

  describe('Teammate with multiple roles', () => {
    it('should return combined permissions for multiple roles', async () => {
      const manageUserPermission = Permission.of(
        'Can Manage All Users',
        'User can manage all users in the workspace',
        'manage_users',
      );
      const manageNothingPermission = Permission.of(
        'Can Manage No One',
        "User can't manage anyone unfortunately",
        'manage_nothing',
      );
      const fetchRolesSpy = jest.spyOn(roleService, 'fetchRoles');
      fetchRolesSpy.mockImplementation(() => {
        return {
          SuperAdmin: Role.of('SuperAdmin', [manageUserPermission]),
          NotSoSuperAdmin: Role.of('NotSoSuperAdmin', [
            manageNothingPermission,
          ]),
        };
      });
      const teammate = await setupWorkspaceWithTeammate(factory, [
        'SuperAdmin',
        'NotSoSuperAdmin',
      ]);
      const result = await service.teammatePermissions(
        teammate.email,
        teammate.workspaceCode,
      );
      expect(result).toEqual(['manage_users', 'manage_nothing']);
    });

    it('should remove duplicate permissions for multiple roles', async () => {
      const manageUserPermission = Permission.of(
        'Can Manage All Users',
        'User can manage all users in the workspace',
        'manage_users',
      );
      const removeWorkspacePermission = Permission.of(
        'Can remove workspace',
        'User can delete workspace',
        'remove_workspace',
      );
      const fetchRolesSpy = jest.spyOn(roleService, 'fetchRoles');
      fetchRolesSpy.mockImplementation(() => {
        return {
          SuperAdmin: Role.of('SuperAdmin', [
            removeWorkspacePermission,
            manageUserPermission,
          ]),
          WorkspaceAdmin: Role.of('WorkspaceAdmin', [manageUserPermission]),
        };
      });
      const teammate = await setupWorkspaceWithTeammate(factory, [
        'SuperAdmin',
        'WorkspaceAdmin',
      ]);
      const result = await service.teammatePermissions(
        teammate.email,
        teammate.workspaceCode,
      );
      expect(result).toEqual(['remove_workspace', 'manage_users']);
    });
  });

  // [WorkspaceAdmin] => [READ_SUPPORT_CONVERSATIONS, REPLY_SUPPORT_CONVERSATIONS, MANAGE_TEAMMATES, MANAGE_CHANNELS, MESSAGE_TEAMMATES]

  // [WorkspaceAdmin, SupportStaff] => [READ_SUPPORT_CONVERSATIONS, REPLY_SUPPORT_CONVERSATIONS, MANAGE_TEAMMATES, MANAGE_CHANNELS, MESSAGE_TEAMMATES]
});
