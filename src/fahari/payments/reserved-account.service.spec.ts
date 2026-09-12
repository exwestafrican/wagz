import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { accountReferenceForUser } from '@/fahari/payments/monnify/monnify.constants';
import {
  MonnifyApiError,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';
import { ReservedAccountStatus } from '@/generated/prisma/client';

describe('ReservedAccountService', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let reservedAccountService: ReservedAccountService;
  let monnifyClient: {
    reserveAccount: jest.Mock;
    getReservedAccount: jest.Mock;
    contractCode: jest.Mock;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    monnifyClient = {
      reserveAccount: jest.fn(),
      getReservedAccount: jest.fn(),
      contractCode: jest.fn().mockReturnValue('contract_code'),
    };
    reservedAccountService = new ReservedAccountService(
      prismaService,
      monnifyClient as unknown as MonnifyClient,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createDriver() {
    return prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      },
    });
  }

  function monnifyResponse(
    accountReference: string,
    customerEmail: string,
  ): ReserveAccountResponseBody {
    return {
      contractCode: 'contract_code',
      accountReference,
      accountName: 'Driver Account',
      currencyCode: 'NGN',
      customerEmail,
      customerName: 'Driver Name',
      status: 'ACTIVE',
      accounts: [
        {
          bankCode: '50515',
          bankName: 'Moniepoint Microfinance Bank',
          accountNumber: '6254727989',
          accountName: 'Driver Account',
        },
      ],
    };
  }

  it('provisions a reserved account via Monnify and persists the mapping', async () => {
    const driver = await createDriver();
    const accountReference = accountReferenceForUser(driver.id);
    monnifyClient.reserveAccount.mockResolvedValueOnce(
      monnifyResponse(accountReference, driver.email),
    );

    const reservedAccount = await reservedAccountService.provisionForUser({
      userId: driver.id,
      bvn: '21212121212',
    });

    expect(reservedAccount).toMatchObject({
      userId: driver.id,
      accountReference,
      accountNumber: '6254727989',
      bankCode: '50515',
      bankName: 'Moniepoint Microfinance Bank',
      customerEmail: driver.email,
      status: ReservedAccountStatus.ACTIVE,
    });
    expect(monnifyClient.reserveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountReference,
        customerEmail: driver.email,
        bvn: '21212121212',
        contractCode: 'contract_code',
      }),
    );
  });

  it('returns the existing active account without calling Monnify again', async () => {
    const driver = await createDriver();
    await prismaService.reservedAccount.create({
      data: {
        userId: driver.id,
        accountReference: accountReferenceForUser(driver.id),
        accountNumber: '1111222233',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: driver.email,
        status: ReservedAccountStatus.ACTIVE,
      },
    });

    const reservedAccount = await reservedAccountService.provisionForUser({
      userId: driver.id,
    });

    expect(reservedAccount.accountNumber).toBe('1111222233');
    expect(monnifyClient.reserveAccount).not.toHaveBeenCalled();
  });

  it('requires bvn or nin when provisioning a new account', async () => {
    const driver = await createDriver();

    await expect(
      reservedAccountService.provisionForUser({ userId: driver.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the driver does not exist', async () => {
    await expect(
      reservedAccountService.provisionForUser({
        userId: 999_999,
        bvn: '21212121212',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recovers an existing Monnify account when reserve reports a duplicate', async () => {
    const driver = await createDriver();
    const accountReference = accountReferenceForUser(driver.id);
    monnifyClient.reserveAccount.mockRejectedValueOnce(
      new MonnifyApiError(
        'Failed to reserve Monnify account',
        '99',
        'You can not reserve two accounts with the same reference.',
      ),
    );
    monnifyClient.getReservedAccount.mockResolvedValueOnce(
      monnifyResponse(accountReference, driver.email),
    );

    const reservedAccount = await reservedAccountService.provisionForUser({
      userId: driver.id,
      nin: '12034875601',
    });

    expect(reservedAccount.status).toBe(ReservedAccountStatus.ACTIVE);
    expect(reservedAccount.accountNumber).toBe('6254727989');
    expect(monnifyClient.getReservedAccount).toHaveBeenCalledWith(
      accountReference,
    );
  });
});
