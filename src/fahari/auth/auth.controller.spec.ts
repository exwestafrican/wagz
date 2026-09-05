import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { mockConfigService } from '@/test-helpers/mocks';
import getHttpServer from '@/test-helpers/get-http-server';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';
import { LinkService } from '@/common/link-service';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { AuthController } from '@/fahari/auth/auth.controller';
import { AuthService } from '@/fahari/auth/auth.service';
import { AuthEndpoints } from '@/fahari/auth/consts';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '@/fahari/auth/test-utils/supabase.mock';

describe('AuthController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    mockSupabaseClient = createMockSupabaseClient();
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useFactory: (prisma: PrismaService) =>
            new AuthService(
              mockSupabaseClient as unknown as SupabaseClient,
              new LinkService(mockConfigService),
              new PermissionService(prisma, new RoleService()),
            ),
          inject: [PrismaService],
        },
      ],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('returns 400 if the email is invalid', async () => {
    const response = await request(getHttpServer(app))
      .post(AuthEndpoints.ADMIN_LOGIN)
      .send({ email: 'invalid-email' })
      .set('Accept', 'application/json')
      .expect(HttpStatus.BAD_REQUEST);

    const body = response.body as ValidationErrorResponseDto;
    expect(body.property).toMatchObject(['email']);
  });

  it('returns 200 when the user is a super admin', async () => {
    const tumise = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: 'Tumise',
        lastname: 'Adekoya',
        isSuperAdmin: true,
      },
    });

    await request(getHttpServer(app))
      .post(AuthEndpoints.ADMIN_LOGIN)
      .send({ email: tumise.email })
      .set('Accept', 'application/json')
      .expect(HttpStatus.OK);

    expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: tumise.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://app.usewaggz.com/fahari/admin',
      },
    });
  });

  it('returns 401 when the user is not a super admin', async () => {
    const kemi = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: 'Kemi',
        lastname: 'Ade',
        isSuperAdmin: false,
      },
    });

    await request(getHttpServer(app))
      .post(AuthEndpoints.ADMIN_LOGIN)
      .send({ email: kemi.email })
      .set('Accept', 'application/json')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns 401 when the user does not exist', async () => {
    await request(getHttpServer(app))
      .post(AuthEndpoints.ADMIN_LOGIN)
      .send({ email: faker.internet.email().toLowerCase() })
      .set('Accept', 'application/json')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
