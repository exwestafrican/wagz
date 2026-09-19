import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, NotFoundException } from '@nestjs/common';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';

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
} from '@/fahari/payments/monnify/monnify.types';
import type { EmailClient } from '@/messaging/email/email-client';
import {
  ReservedAccountRequestStatus,
  ReservedAccountStatus,
} from '@/generated/prisma/client';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';
import {
  monnifyReserveAccountResponseFactory,
  toProvisionReservedAccountDto,
} from '@/factories/fahari/reserved-account.factory';

const DRIVER_BVN = '21212121212';
const DRIVER_NIN = '12034875601';

describe('ReservedAccountService', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
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
    factory = Factory.createStrategy(prismaService);
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

  it('provisions a reserved account via Monnify and persists the mapping', async () => {
    const requester = await factory.persist('user', () => userFactory.build());
    const owner = await factory.persist('user', () => userFactory.build());
    monnifyClient.reserveAccount.mockImplementation(
      (request: ReserveAccountRequest) =>
        Promise.resolve(
          monnifyReserveAccountResponseFactory.build({
            accountReference: request.accountReference,
            customerEmail: owner.email,
          }),
        ),
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
  });

  it('returns the existing active account without calling Monnify again', async () => {
    const requester = await factory.persist('user', () => userFactory.build());
    const owner = await factory.persist('user', () => userFactory.build());
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
    const owner = await factory.persist('user', () => userFactory.build());
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
    const requester = await factory.persist('user', () => userFactory.build());
    await expect(
      reservedAccountService.provision(requester.id, 999_999, {
        bvn: DRIVER_BVN,
        nin: DRIVER_NIN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks the request log failed when Monnify provision fails', async () => {
    const requester = await factory.persist('user', () => userFactory.build());
    const owner = await factory.persist('user', () => userFactory.build());
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
    const requester = await factory.persist('user', () => userFactory.build());
    const owner = await factory.persist('user', () => userFactory.build());
    emailClient.send.mockRejectedValue(new Error('smtp down'));
    monnifyClient.reserveAccount.mockImplementation(
      (request: ReserveAccountRequest) =>
        Promise.resolve(
          monnifyReserveAccountResponseFactory.build({
            accountReference: request.accountReference,
            customerEmail: owner.email,
          }),
        ),
    );

    const reservedAccount = await reservedAccountService.provision(
      requester.id,
      owner.id,
      { bvn: DRIVER_BVN, nin: DRIVER_NIN },
    );

    expect(reservedAccount.accountNumber).toBe('6254727989');
    expect(reservedAccount.status).toBe(ReservedAccountStatus.ACTIVE);
  });

  describe('provisionForNewDriver', () => {
    it('creates the driver then provisions a reserved account', async () => {
      const requester = await factory.persist('user', () =>
        userFactory.build(),
      );
      const ada = userFactory.build({
        firstname: ' Ada ',
        lastname: ' Okafor ',
        email: 'Ada.Okafor@Example.COM',
      });
      monnifyClient.reserveAccount.mockImplementation(
        (request: ReserveAccountRequest) =>
          Promise.resolve(
            monnifyReserveAccountResponseFactory.build({
              accountReference: request.accountReference,
              customerEmail: request.customerEmail,
            }),
          ),
      );

      const reservedAccount =
        await reservedAccountService.provisionForNewDriver(
          requester.id,
          toProvisionReservedAccountDto(ada),
        );

      const createdDriver = await prismaService.user.findUniqueOrThrow({
        where: { email: 'ada.okafor@example.com' },
      });
      expect(createdDriver).toMatchObject({
        firstname: 'ada',
        lastname: 'okafor',
        isSuperAdmin: false,
      });
      expect(reservedAccount).toMatchObject({
        userId: createdDriver.id,
        accountNumber: '6254727989',
        customerEmail: createdDriver.email,
        status: ReservedAccountStatus.ACTIVE,
      });
      expect(monnifyClient.reserveAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: createdDriver.email,
          customerName: 'ada okafor',
          accountName: 'ada okafor',
          bvn: DRIVER_BVN,
          nin: DRIVER_NIN,
        }),
      );
    });

    it('throws ItemAlreadyExistsInDb when a user with the email already exists', async () => {
      const requester = await factory.persist('user', () =>
        userFactory.build(),
      );
      const existingDriver = await factory.persist('user', () =>
        userFactory.build(),
      );

      await expect(
        reservedAccountService.provisionForNewDriver(
          requester.id,
          toProvisionReservedAccountDto(existingDriver),
        ),
      ).rejects.toBeInstanceOf(ItemAlreadyExistsInDb);

      expect(monnifyClient.reserveAccount).not.toHaveBeenCalled();
      expect(
        await prismaService.user.count({
          where: { email: existingDriver.email },
        }),
      ).toBe(1);
      expect(await prismaService.reservedAccount.count()).toBe(0);
    });
  });
});
