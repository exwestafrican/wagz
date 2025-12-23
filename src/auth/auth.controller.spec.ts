import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import request from 'supertest';

import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../test-helpers/test-app';
import { ConfigModule } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from './test-utils/supabase.mock';
import PasswordGenerator from './services/password.generator';
import { AuthEndpoints } from './consts';
import { Server } from 'http';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;
  let app: INestApplication;
  let mockSupabaseClient: MockSupabaseClient;

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

    controller = module.get<AuthController>(AuthController);
    app = await createTestApp(module);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  function getHttpServer(app: INestApplication): Server {
    return app.getHttpServer() as unknown as Server;
  }

  describe('magic link request', () => {
    it('should return 400 if the email is invalid', () => {
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: 'invalid-email' })
        .set('Accept', 'application/json')
        .expect(400);
    });

    it('should return 400 when email is blank', () => {
      return request(getHttpServer(app))
        .post(AuthEndpoints.REQUEST_MAGIC_LINK)
        .send({ email: '' })
        .set('Accept', 'application/json')
        .expect(400);
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
      it('should return 400 if the email is invalid', () => {
        return request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send({ email: 'invalid-email' })
          .set('Accept', 'application/json')
          .expect(400);
      });

      it('should return 400 when email is already registered', () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: { user: null, session: null },
          error: {
            message: 'User already registered',
            status: 422,
            code: 'user_already_exists',
          },
        });
        return request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(mockUserSignupDetails({ email: 'test@example.com' }))
          .set('Accept', 'application/json')
          .expect(409);
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
    });

    describe('successful signup', () => {
      it('should return 201 when email is valid', () => {
        mockSupabaseClient.auth.signUp.mockResolvedValue({
          data: {
            user: { id: '123', email: 'test@example.com' },
            session: null,
          },
          error: null,
        });
        return request(getHttpServer(app))
          .post(AuthEndpoints.SIGNUP_EMAIL_ONLY)
          .send(mockUserSignupDetails({ email: 'test@example.com' }))
          .set('Accept', 'application/json')
          .expect(201);
      });
    });
  });
});
