import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  INestApplication,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { SupabaseClient } from '@supabase/supabase-js';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { mockConfigService } from '@/test-helpers/mocks';
import { LinkService } from '@/common/link-service';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { AuthService } from '@/fahari/auth/auth.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '@/test-helpers/supabase.mock';

describe('AuthService', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    mockSupabaseClient = createMockSupabaseClient();
    authService = new AuthService(
      mockSupabaseClient as unknown as SupabaseClient,
      new LinkService(mockConfigService),
      new FahariPermissionService(prismaService),
      prismaService,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('sends a magic link when the user is a super admin', async () => {
    const tumise = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: 'Tumise',
        lastname: 'Adekoya',
        isSuperAdmin: true,
      },
    });

    await authService.requestAdminMagicLinkOrThrow(tumise.email);

    expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: tumise.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://app.usewaggz.com/fahari/admin',
      },
    });
  });

  it('throws UnauthorizedException and does not call supabase when the user is not a super admin', async () => {
    const kemi = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: 'Kemi',
        lastname: 'Ade',
        isSuperAdmin: false,
      },
    });

    await expect(
      authService.requestAdminMagicLinkOrThrow(kemi.email),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockSupabaseClient.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException and does not call supabase when the user does not exist', async () => {
    await expect(
      authService.requestAdminMagicLinkOrThrow(
        faker.internet.email().toLowerCase(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockSupabaseClient.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  describe('verifyOtpOrThrow', () => {
    const tumiseEmail = 'tumise@usewaggz.com';
    const otp = '123456';

    it('returns the access token when supabase verifies the OTP', async () => {
      await prismaService.user.create({
        data: {
          email: tumiseEmail,
          firstname: 'Tumise',
          lastname: 'Adekoya',
          isSuperAdmin: true,
        },
      });
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: { access_token: 'a-valid-access-token' } },
        error: null,
      });

      const otpVerification = await authService.verifyOtpOrThrow(
        tumiseEmail,
        otp,
      );

      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        email: tumiseEmail,
        token: otp,
        type: 'email',
      });
      expect(otpVerification).toEqual({
        accessToken: 'a-valid-access-token',
      });
    });

    it('throws UnauthorizedException when supabase rejects the OTP', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired or is invalid' },
      });

      await expect(
        authService.verifyOtpOrThrow(tumiseEmail, 'wrong-otp'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ServiceUnavailableException when supabase returns no session', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        authService.verifyOtpOrThrow(tumiseEmail, otp),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
