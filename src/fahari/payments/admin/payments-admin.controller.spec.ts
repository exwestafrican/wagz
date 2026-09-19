import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import RequestUser from '@/auth/domain/request-user';
import { PaymentsAdminController } from '@/fahari/payments/admin/payments-admin.controller';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import { WelcomeNotificationService } from '@/fahari/notification/email/welcome-notification.service';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { ReserveAccountRequest } from '@/fahari/payments/monnify/monnify.types';
import { ReservedAccountStatus } from '@/generated/prisma/client';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';
import {
  monnifyReserveAccountResponseFactory,
  toProvisionReservedAccountDto,
} from '@/factories/fahari/reserved-account.factory';

describe('PaymentsAdminController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let adminController: PaymentsAdminController;
  let monnifyClient: {
    reserveAccount: jest.Mock;
    contractCode: string;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    monnifyClient = {
      reserveAccount: jest.fn(),
      contractCode: 'contract_code',
    };
    const emailClient = { send: jest.fn().mockResolvedValue(undefined) };
    adminController = new PaymentsAdminController(
      new ReservedAccountService(
        prismaService,
        monnifyClient as unknown as MonnifyClient,
        new AccountManager(prismaService),
        new WelcomeNotificationService(emailClient),
      ),
      new FahariPermissionService(prismaService),
    );
  });

  afterEach(async () => {
    monnifyClient.reserveAccount.mockReset();
    await resetDb(prismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it.skip('creates a driver and provisions a reserved account for a super admin', async () => {
    const tumise = await factory.persist('user', () =>
      userFactory.superAdmin(),
    );
    const ada = userFactory.build({
      firstname: 'ada',
      lastname: 'okafor',
      email: 'ada.okafor@me.com',
    });
    const openAccountRequest = toProvisionReservedAccountDto(ada);
    monnifyClient.reserveAccount.mockImplementation(
      (request: ReserveAccountRequest) =>
        Promise.resolve(
          monnifyReserveAccountResponseFactory.build({
            accountReference: request.accountReference,
            customerEmail: request.customerEmail,
          }),
        ),
    );

    const reservedAccount = await adminController.provisionReservedAccount(
      RequestUser.of(tumise.email),
      openAccountRequest,
    );

    const createdDriver = await prismaService.user.findUniqueOrThrow({
      where: { email: ada.email },
    });
    expect(reservedAccount).toMatchObject({
      userId: createdDriver.id,
      accountNumber: '6254727989',
      status: ReservedAccountStatus.ACTIVE,
    });
  });

  it('throws ConflictException when a user with the email already exists', async () => {
    const tumise = await factory.persist('user', () =>
      userFactory.superAdmin(),
    );
    const existingDriver = await factory.persist('user', () =>
      userFactory.build(),
    );

    await expect(
      adminController.provisionReservedAccount(
        RequestUser.of(tumise.email),
        toProvisionReservedAccountDto(existingDriver),
      ),
    ).rejects.toThrow(ConflictException);

    expect(monnifyClient.reserveAccount).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the caller is not a super admin', async () => {
    const kemi = await factory.persist('user', () => userFactory.build());

    await expect(
      adminController.provisionReservedAccount(
        RequestUser.of(kemi.email),
        toProvisionReservedAccountDto(userFactory.build()),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(monnifyClient.reserveAccount).not.toHaveBeenCalled();
    expect(await prismaService.reservedAccount.count()).toBe(0);
  });
});
