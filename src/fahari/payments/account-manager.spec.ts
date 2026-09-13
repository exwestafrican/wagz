import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { AccountManager } from '@/fahari/payments/account-manager';
import { ReservedAccountStatus } from '@/generated/prisma/client';

describe('AccountManager', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accountManager: AccountManager;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    accountManager = new AccountManager(prismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('returns the active reserved account for a driver without prefix or code', async () => {
    const owner = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      },
    });
    await prismaService.reservedAccount.create({
      data: {
        userId: owner.id,
        accountPrefix: 'FAH',
        accountCode: 10000,
        accountReference: 'FAH10000',
        accountNumber: '6254727989',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: owner.email,
        status: ReservedAccountStatus.ACTIVE,
      },
    });

    const reservedAccount = await accountManager.getReservedAccount(owner.id);

    expect(reservedAccount).toEqual({
      id: expect.any(String),
      userId: owner.id,
      accountReference: 'FAH10000',
      accountNumber: '6254727989',
      bankCode: '50515',
      bankName: 'Moniepoint Microfinance Bank',
      status: ReservedAccountStatus.ACTIVE,
      customerEmail: owner.email,
    });
    expect(reservedAccount).not.toHaveProperty('accountPrefix');
    expect(reservedAccount).not.toHaveProperty('accountCode');
  });

  it('returns null when the driver has no active reserved account', async () => {
    const owner = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      },
    });

    await expect(
      accountManager.getReservedAccount(owner.id),
    ).resolves.toBeNull();
  });

  it('throws when getReservedAccountOrThrow finds no active account', async () => {
    const owner = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      },
    });

    await expect(
      accountManager.getReservedAccountOrThrow(owner.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
