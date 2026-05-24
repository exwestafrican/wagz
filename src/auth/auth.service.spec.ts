import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from './test-utils/supabase.mock';
import PasswordGenerator from './services/password.generator';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { LinkService } from '@/common/link-service';
import { TeammatesService } from '@/teammates/teammates.service';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import RequestUser from '@/auth/domain/request-user';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { PERMISSIONS } from '@/permission/types';

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabaseClient: MockSupabaseClient;
  let permissionService: PermissionService;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AuthService,
        PasswordGenerator,
        {
          provide: SupabaseClient,
          useValue: mockSupabaseClient as unknown as SupabaseClient,
        },
        PrismaService,
        LinkService,
        TeammatesService,
        PermissionService,
        RoleService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signTeammateUpAndPushMagicLink', () => {
    it.each([['user_already_exists'], ['email_exists']] as const)(
      'when user already has account, we just log into correct workspace (%s)',
      async (errorCode) => {
        const email = 'teammate@example.com';
        const workspaceCode = 'WS01';

        mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
          data: { user: null },
          error: {
            message: 'User already registered',
            status: 422,
            code: errorCode,
          },
        });

        await service.signTeammateUpAndPushMagicLink(email, workspaceCode);

        expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
          email,
          options: {
            shouldCreateUser: false,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            emailRedirectTo: expect.stringContaining(
              `/setup/workspace?code=${workspaceCode}`,
            ),
          },
        });
      },
    );
  });

  describe('sendMagicLinkOrThrow', () => {
    it('calls signInWithOtp with the given workspace redirect URL', async () => {
      const email = 'admin@useenvoye.com';
      const workspaceCode = ENVOYE_WORKSPACE_CODE;

      await service.sendMagicLinkOrThrow(email, workspaceCode);

      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email,
        options: {
          shouldCreateUser: false,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          emailRedirectTo: expect.stringContaining(
            `/setup/workspace?code=${workspaceCode}`,
          ),
        },
      });
    });
  });

  describe('requestAdminMagicLinkOrThrow', () => {
    it('sends magic link when runIfPermitted succeeds', async () => {
      const email = 'admin@useenvoye.com';
      jest.spyOn(permissionService, 'runIfPermitted').mockImplementation(
        async (_user, _workspace, _permission, action) => {
          await action({} as never);
        },
      );

      await service.requestAdminMagicLinkOrThrow(email);

      expect(permissionService.runIfPermitted).toHaveBeenCalledWith(
        RequestUser.of(email),
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.ACCESS_ADMIN,
        expect.any(Function),
      );
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when runIfPermitted throws ForbiddenException', async () => {
      jest
        .spyOn(permissionService, 'runIfPermitted')
        .mockRejectedValue(new ForbiddenException());

      await expect(
        service.requestAdminMagicLinkOrThrow('admin@useenvoye.com'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
