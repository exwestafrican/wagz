import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from './test-utils/supabase.mock';
import PasswordGenerator from './services/password.generator';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordGenerator,
        ConfigService,
        {
          provide: SupabaseClient,
          useValue: mockSupabaseClient as unknown as SupabaseClient,
        },
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
