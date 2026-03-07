import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { PERMISSIONS } from '../types';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  test.each(['WorkspaceAdmin', 'SupportStaff', 'WorkspaceMember'])(
    'return correct role for %s',
    (roleCode: string) => {
      expect(service.fetchRole(roleCode)?.code).toBe(roleCode);
    },
  );

  it('should return correct permission for role', () => {
    expect(service.permissions('WorkspaceAdmin')).toMatchObject([
      PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
      PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
      PERMISSIONS.MESSAGE_TEAMMATES,
      PERMISSIONS.MANAGE_TEAMMATES,
      PERMISSIONS.MANAGE_CHANNELS,
    ]);
  });

  it('should return empty permissions for invalid role', () => {
    expect(service.permissions('InvalidRole')).toMatchObject([]);
  });
});
