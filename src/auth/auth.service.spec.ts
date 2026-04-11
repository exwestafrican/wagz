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

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabaseClient: MockSupabaseClient;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should throw AccountExistsException when email is already registered', () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 422,
          code: 'user_already_exists',
        },
      });
    });
  });

  describe('signTeammateUpAndPushMagicLink', () => {
    it('when user already has account, we just log into correct workspace', async () => {
      const email = 'teammate@example.com';
      const workspaceCode = 'WS01';

      mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: null },
        error: {
          message: 'User already registered',
          status: 422,
          code: 'user_already_exists',
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
    });
  });
});
