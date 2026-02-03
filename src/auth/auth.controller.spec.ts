import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import request from 'supertest';

import { INestApplication } from '@nestjs/common';
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
import preverificationFactory from '@/factories/roadmap/preverification.factory';

describe('AuthController', () => {
  let app: INestApplication;
  let mockSupabaseClient: MockSupabaseClient;
  let prismaService: PrismaService;

  function mockUserSignupDetails(signupDetails: Record<string, string>) {
    const mockDetails = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'Example',
      companyName: 'Example Inc.',
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
      ],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.preVerification.deleteMany();
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

    it('should return 200 when email is valid', () => {
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'test@example.com' })
        .set('Accept', 'application/json')
        .expect(200);
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
        await prismaService.preVerification.create({
          data: preverificationFactory.build({ email: 'test@example.com' }),
        });
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
    });
  });
});
