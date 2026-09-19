import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { AccountManager } from '@/fahari/payments/account-manager';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { WelcomeNotificationService } from '@/fahari/notification/email/welcome-notification.service';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { MONIEPOINT_BANK_CODE } from '@/fahari/payments/monnify/monnify-bank-config';
import {
  MonnifyApiError,
  ReserveAccountRequest,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';
import type { EmailClient } from '@/messaging/email/email-client';
import { PAYMENTS_EMAIL } from '@/fahari/const';
import { fullName } from '@/fahari/user/full-name';
import {
  ReservedAccountRequestStatus,
  ReservedAccountStatus,
} from '@/generated/prisma/client';

const DRIVER_BVN = '21212121212';
const DRIVER_NIN = '12034875601';

describe('ReservedAccountService', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let reservedAccountService: ReservedAccountService;
  let accountManager: AccountManager;
  let emailClient: { send: jest.MockedFunction<EmailClient['send']> };
  let monnifyClient: {
    reserveAccount: jest.Mock;
    contractCode: string;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    accountManager = new AccountManager(prismaService);
    emailClient = { send: jest.fn().mockResolvedValue(undefined) };
    monnifyClient = {
      reserveAccount: jest.fn(),
      contractCode: 'contract_code',
    };
    reservedAccountService = new ReservedAccountService(
      prismaService,
      monnifyClient as unknown as MonnifyClient,
      accountManager,
      new WelcomeNotificationService(emailClient),
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createUser() {
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
    const requester = await createUser();
    const owner = await createUser();
    monnifyClient.reserveAccount.mockImplementation(
      (request: ReserveAccountRequest) =>
        Promise.resolve(monnifyResponse(request.accountReference, owner.email)),
    );

    const reservedAccount = await reservedAccountService.provision(
      requester.id,
      owner.id,
      { bvn: DRIVER_BVN, nin: DRIVER_NIN },
    );

    expect(reservedAccount).toMatchObject({
      userId: owner.id,
      accountNumber: '6254727989',
      bankCode: '50515',
      bankName: 'Moniepoint Microfinance Bank',
      customerEmail: owner.email,
      status: ReservedAccountStatus.ACTIVE,
    });
    expect(reservedAccount.accountReference).toMatch(/^FAH\d+$/);
    expect(reservedAccount).not.toHaveProperty('accountPrefix');
    expect(reservedAccount).not.toHaveProperty('accountCode');
    expect(monnifyClient.reserveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountReference: reservedAccount.accountReference,
        customerEmail: owner.email,
        bvn: DRIVER_BVN,
        nin: DRIVER_NIN,
        contractCode: 'contract_code',
        getAllAvailableBanks: false,
        preferredBanks: [MONIEPOINT_BANK_CODE],
      }),
    );

    const requestLog =
      await prismaService.reservedAccountRequestLog.findFirstOrThrow({
        where: { ownerId: reservedAccount.userId },
      });
    expect(requestLog).toMatchObject({
      requestedBy: requester.id,
      ownerId: owner.id,
      accountPrefix: 'FAH',
      accountCode: Number(reservedAccount.accountReference.slice(3)),
      status: ReservedAccountRequestStatus.SUCCESS,
    });
    expect(emailClient.send).toHaveBeenCalledTimes(1);
    expect(emailClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { email: PAYMENTS_EMAIL, name: 'Fleets by Fahari' },
        to: { email: owner.email, name: fullName(owner) },
        subject: 'Welcome to Fleets by Fahari',
      }),
    );
  });

  it('returns the existing active account without calling Monnify again', async () => {
    const requester = await createUser();
    const owner = await createUser();
    await prismaService.reservedAccount.create({
      data: {
        userId: owner.id,
        accountPrefix: 'FAH',
        accountCode: 11111,
        accountReference: 'FAH11111',
        accountNumber: '1111222233',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: owner.email,
        status: ReservedAccountStatus.ACTIVE,
      },
    });

    const reservedAccount = await reservedAccountService.provision(
      requester.id,
      owner.id,
      { bvn: DRIVER_BVN, nin: DRIVER_NIN },
    );

    expect(reservedAccount.accountNumber).toBe('1111222233');
    expect(reservedAccount.accountReference).toBe('FAH11111');
    expect(monnifyClient.reserveAccount).not.toHaveBeenCalled();
    expect(emailClient.send).not.toHaveBeenCalled();
  });

  it('allows multiple reserved account rows for the same user', async () => {
    const owner = await createUser();
    await prismaService.reservedAccount.create({
      data: {
        userId: owner.id,
        accountPrefix: 'FAH',
        accountCode: 22222,
        accountReference: 'FAH22222',
        accountNumber: '1111222233',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: owner.email,
        status: ReservedAccountStatus.ACTIVE,
      },
    });
    await prismaService.reservedAccount.create({
      data: {
        userId: owner.id,
        accountPrefix: 'FAH',
        accountCode: 33333,
        accountReference: 'FAH33333',
        accountNumber: '4444555566',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: owner.email,
        status: ReservedAccountStatus.DEACTIVATED,
      },
    });

    expect(
      await prismaService.reservedAccount.count({
        where: { userId: owner.id },
      }),
    ).toBe(2);
  });

  it('throws when the owner does not exist', async () => {
    const requester = await createUser();
    await expect(
      reservedAccountService.provision(requester.id, 999_999, {
        bvn: DRIVER_BVN,
        nin: DRIVER_NIN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the request log failed when Monnify provision fails', async () => {
    const requester = await createUser();
    const owner = await createUser();
    monnifyClient.reserveAccount.mockRejectedValue(
      new MonnifyApiError(
        'Failed to reserve Monnify account',
        '99',
        'Unable to create reserved account',
      ),
    );

    await expect(
      reservedAccountService.provision(requester.id, owner.id, {
        bvn: DRIVER_BVN,
        nin: DRIVER_NIN,
      }),
    ).rejects.toBeInstanceOf(MonnifyApiError);

    const requestLog = await prismaService.reservedAccountRequestLog.findFirst({
      where: { ownerId: owner.id },
    });
    expect(requestLog).toMatchObject({
      requestedBy: requester.id,
      ownerId: owner.id,
      status: ReservedAccountRequestStatus.FAILED,
      failureMessage: 'Unable to create reserved account',
    });

    expect(
      await prismaService.reservedAccount.count({
        where: { userId: owner.id },
      }),
    ).toBe(0);
  });

  it('still provisions when the welcome email fails to send', async () => {
    const requester = await createUser();
    const owner = await createUser();
    emailClient.send.mockRejectedValue(new Error('smtp down'));
    monnifyClient.reserveAccount.mockImplementation(
      (request: ReserveAccountRequest) =>
        Promise.resolve(monnifyResponse(request.accountReference, owner.email)),
    );

    const reservedAccount = await reservedAccountService.provision(
      requester.id,
      owner.id,
      { bvn: DRIVER_BVN, nin: DRIVER_NIN },
    );

    expect(reservedAccount.accountNumber).toBe('6254727989');
    expect(reservedAccount.status).toBe(ReservedAccountStatus.ACTIVE);
  });
});
