import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import request from 'supertest';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { ConfigModule } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from './test-utils/supabase.mock';
import PasswordGenerator from './services/password.generator';
import { AuthEndpoints } from './consts';
import { Server } from 'http';
import { PrismaService } from '@/prisma/prisma.service';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';
import { OtpVerificationResponseDto } from './dto/otp-verification-response.dto';
import preVerificationFactory from '@/factories/roadmap/preverification.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { LinkService } from '@/common/link-service';
import { TeammatesService } from '@/teammates/teammates.service';
import { TeammateStatus } from '@/generated/prisma/client';
import { ROLES } from '@/permission/types';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { resetDb } from '@/test-helpers/rest-db';

describe('AuthController', () => {
  let app: INestApplication;
  let mockSupabaseClient: MockSupabaseClient;
  let prismaService: PrismaService;
  let factory: PersistStrategy;

  function mockUserSignupDetails(signupDetails: Record<string, string>) {
    const mockDetails = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'Example',
      companyName: 'Example Inc.',
      timezone: 'Africa/Lagos',
    };
    return { ...mockDetails, ...signupDetails };
  }

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()], // Add ConfigModule for setupApp to work
      controllers: [AuthController],
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

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  function getHttpServer(app: INestApplication): Server {
    return app.getHttpServer() as unknown as Server;
  }

  function mockSupabaseSuccess(signupDetails: Record<string, string>) {
    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: {
        user: { id: '123', ...signupDetails },
        session: null,
      },
      error: null,
    });
  }

  describe('magic link request', () => {
    it('should return 400 if the email is invalid', async () => {
      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'invalid-email' })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['email']);
    });

    it('should return 400 when email is blank', async () => {
      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: '' })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['email']);
    });

    it('should return 200 when email is valid', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: 'test@example.com',
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'test@example.com' })
        .set('Accept', 'application/json')
        .expect(200);
    });

    it('should return unauthorized when email is valid but user is not an active workspace member', () => {
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'test@example.com' })
        .set('Accept', 'application/json')
        .expect(401);
    });

    it('should return 401 when teammate has no active workspace', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: 'test@example.com',
          workspaceCode: '67u9qa',
          groups: [ROLES.WorkspaceAdmin.code],
          status: TeammateStatus.DISABLED,
        }),
      );
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'test@example.com' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('otp verification', () => {
    const email = 'test@example.com';

    function mockVerifyOtpSuccess(accessToken = 'mock-access-token') {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: { access_token: accessToken } },
        error: null,
      });
    }

    it('should return 400 if the email is invalid', async () => {
      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.VERIFY_OTP)
        .send({ email: 'invalid-email', otp: '123456' })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['email']);
    });

    it('should return 400 if the OTP is empty', async () => {
      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.VERIFY_OTP)
        .send({ email, otp: '' })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['otp']);
    });

    it('should return 200 with the workspace code and access token when the OTP is valid', async () => {
      const { workspace } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      mockVerifyOtpSuccess('a-valid-access-token');

      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.VERIFY_OTP)
        .send({ email, otp: '123456' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.OK);

      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        email,
        token: '123456',
        type: 'email',
      });
      const body = response.body as OtpVerificationResponseDto;
      expect(body).toEqual({
        workspaceCode: workspace.code,
        accessToken: 'a-valid-access-token',
      });
    });

    it('should return 401 when supabase rejects the OTP', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired or is invalid' },
      });

      await request(getHttpServer(app))
        .post(AuthEndpoints.VERIFY_OTP)
        .send({ email, otp: 'wrong-otp' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when supabase returns no session and no error', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await request(getHttpServer(app))
        .post(AuthEndpoints.VERIFY_OTP)
        .send({ email, otp: '123456' })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('admin login', () => {
    const adminEmail = 'admin@useenvoye.com';

    it('should return 400 if the email is invalid', async () => {
      const response = await request(getHttpServer(app))
        .post(AuthEndpoints.ADMIN_LOGIN)
        .send({ email: 'invalid-email' })
        .set('Accept', 'application/json')
        .expect(400);

      const body = response.body as ValidationErrorResponseDto;
      expect(body.property).toMatchObject(['email']);
    });

    it('should return 200 when user is SuperAdmin in Envoye workspace', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: adminEmail,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.SuperAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .post(AuthEndpoints.ADMIN_LOGIN)
        .send({ email: adminEmail })
        .set('Accept', 'application/json')
        .expect(HttpStatus.OK);

      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: adminEmail,
        options: {
          shouldCreateUser: false,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          emailRedirectTo: expect.stringMatching(/\/admin$/),
        },
      });
    });

    it('should return 401 when user lacks ACCESS_ADMIN in Envoye workspace', async () => {
      await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: adminEmail,
          workspaceCode: ENVOYE_WORKSPACE_CODE,
          groups: [ROLES.WorkspaceAdmin.code],
        }),
      );

      await request(getHttpServer(app))
        .post(AuthEndpoints.ADMIN_LOGIN)
        .send({ email: adminEmail })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when email has no teammate in Envoye workspace', async () => {
      await request(getHttpServer(app))
        .post(AuthEndpoints.ADMIN_LOGIN)
        .send({ email: adminEmail })
        .set('Accept', 'application/json')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('signup', () => {
    describe('unsuccessful signup', () => {
      it('should return 400 if the email is invalid', async () => {
        const response = await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(mockUserSignupDetails({ email: 'invalid-email' }))
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['email']);
      });

      it('should return 400 when email is already registered', async () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: {
            message: 'User already registered',
            status: 422,
            code: 'user_already_exists',
          },
        });
        await factory.persist('preverification', () =>
          preVerificationFactory.build({ email: 'test@example.com' }),
        );
        await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(mockUserSignupDetails({ email: 'test@example.com' }))
          .set('Accept', 'application/json')
          .expect(409);

        const preverifications = await prismaService.preVerification.findMany();
        expect(preverifications).toHaveLength(1);
      });

      it('should return 503 when something unexpected happens with supabase', () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: {
            message: 'fetch failed',
            status: 500,
          },
        });
        return request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(mockUserSignupDetails({ email: 'test@example.com' }))
          .set('Accept', 'application/json')
          .expect(503);
      });

      it('returns bad request when national number is missing', async () => {
        const response = await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({
            ...mockUserSignupDetails({}),
            phoneNumber: {
              countryCallingCode: '+234',
            },
          })
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['phoneNumber']);
      });

      it('returns bad request when country call code is missing', async () => {
        const response = await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({
            ...mockUserSignupDetails({}),
            phoneNumber: {
              nationalNumber: '8190086655',
            },
          })
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['phoneNumber']);
      });

      it('should return 400 when timezone is invalid', async () => {
        const signupDetails = mockUserSignupDetails({
          email: 'test@example.com',
          timezone: 'Invalid/Timezone',
        });
        mockSupabaseSuccess(signupDetails);
        const response = await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({ ...signupDetails })
          .set('Accept', 'application/json')
          .expect(400);

        const body = response.body as ValidationErrorResponseDto;
        expect(body.property).toMatchObject(['timezone']);
      });

      test.each([
        { countryCallingCode: '234', nationalNumber: '8169087765' },
        { countryCallingCode: '+234', nationalNumber: '816908776' },
      ])(
        'returns bad request when phone number is invalid',
        async (phoneNumber: {
          countryCallingCode: string;
          nationalNumber: string;
        }) => {
          const response = await request(getHttpServer(app))
            .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
            .send({
              ...mockUserSignupDetails({}),
              phoneNumber: phoneNumber,
            })
            .set('Accept', 'application/json')
            .expect(400);

          const body = response.body as ValidationErrorResponseDto;
          expect(body.property).toMatchObject(['phoneNumber']);
        },
      );
    });

    describe('successful signup', () => {
      it('should return 201 when email is valid', async () => {
        const signupDetails = mockUserSignupDetails({
          email: 'test@example.com',
        });
        mockSupabaseSuccess(signupDetails);
        await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(signupDetails)
          .set('Accept', 'application/json')
          .expect(201);

        const preVerification = await prismaService.preVerification.findUnique({
          where: { email: signupDetails.email },
        });
        expect(preVerification).not.toBeNull();
        expect(preVerification?.email).toBe(signupDetails.email);
      });

      it('should be successful with valid phone number', async () => {
        const signupDetails = mockUserSignupDetails({
          email: 'test@example.com',
        });
        mockSupabaseSuccess(signupDetails);

        await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({
            ...signupDetails,
            phoneNumber: {
              countryCallingCode: '+234',
              nationalNumber: '8190086655',
            },
          })
          .set('Accept', 'application/json')
          .expect(201);
      });

      it('should return 201 when timezone is valid', async () => {
        const signupDetails = mockUserSignupDetails({
          email: 'test@example.com',
          timezone: 'Africa/Lagos',
        });
        mockSupabaseSuccess(signupDetails);
        await request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({ ...signupDetails })
          .set('Accept', 'application/json')
          .expect(201);
      });
    });
  });
});
