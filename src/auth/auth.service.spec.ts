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
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import {
  workspaceManagerTestingProvider,
  createMockEmailClient,
} from '@/auth/test-utils/auth.module.test-setup';

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    const mockEmailClient = createMockEmailClient();
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
        WorkspaceLinkService,
        WorkspaceInviteService,
        workspaceManagerTestingProvider(mockEmailClient),
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
});
