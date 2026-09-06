import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { SupabaseClient } from '@supabase/supabase-js';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { CreateSuperAdminCommand } from '@/fahari/commands/create-super-admin.command';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '@/test-helpers/supabase.mock';

describe('CreateSuperAdminCommand', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let command: CreateSuperAdminCommand;
  let mockSupabaseClient: MockSupabaseClient;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    mockSupabaseClient = createMockSupabaseClient();
    command = new CreateSuperAdminCommand(
      prismaService,
      mockSupabaseClient as unknown as SupabaseClient,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('creates a super admin in supabase and the database', async () => {
    const email = faker.internet.email().toLowerCase();
    const firstname = faker.person.firstName();
    const lastname = faker.person.lastName();

    await command.run([], { email, firstname, lastname });

    expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalled();
    const createdUser = await prismaService.user.findUniqueOrThrow({
      where: { email },
    });
    expect(createdUser).toMatchObject({
      email,
      firstname,
      lastname,
      isSuperAdmin: true,
    });
  });

  it('stores email lowercased in supabase and the database', async () => {
    const mixedCaseEmail = `Tumise.${faker.string.alphanumeric(8)}@Gmail.COM`;

    await command.run([], {
      email: mixedCaseEmail,
      firstname: 'Tumise',
      lastname: 'Adekoya',
    });

    expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: mixedCaseEmail.toLowerCase() }),
    );
    const createdUser = await prismaService.user.findUniqueOrThrow({
      where: { email: mixedCaseEmail.toLowerCase() },
    });
    expect(createdUser.email).toBe(mixedCaseEmail.toLowerCase());
  });

  it('still creates the database user when the supabase account already exists', async () => {
    const email = faker.internet.email().toLowerCase();
    const firstname = faker.person.firstName();
    const lastname = faker.person.lastName();
    mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: {
        message: 'User already registered',
        status: 422,
        code: 'user_already_exists',
      },
    });

    await command.run([], { email, firstname, lastname });

    expect(
      await prismaService.user.findUniqueOrThrow({ where: { email } }),
    ).toMatchObject({
      email,
      firstname,
      lastname,
      isSuperAdmin: true,
    });
  });

  it('does not persist a database user when supabase create fails', async () => {
    const email = faker.internet.email().toLowerCase();
    mockSupabaseClient.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: {
        message: 'Supabase unavailable',
        status: 500,
        code: 'unexpected_failure',
      },
    });

    await expect(
      command.run([], {
        email,
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(await prismaService.user.count({ where: { email } })).toBe(0);
  });

  it('throws ItemAlreadyExistsInDb when email is already registered', async () => {
    const email = faker.internet.email().toLowerCase();
    const firstname = faker.person.firstName();
    const lastname = faker.person.lastName();

    await command.run([], { email, firstname, lastname });

    await expect(
      command.run([], { email, firstname, lastname }),
    ).rejects.toBeInstanceOf(ItemAlreadyExistsInDb);
    expect(await prismaService.user.count({ where: { email } })).toBe(1);
  });
});
