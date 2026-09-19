import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import type { EmailClient } from '@/messaging/email/email-client';
import { AccountManager } from '@/fahari/payments/account-manager';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { computeMonnifySignature } from '@/fahari/payments/monnify/monnify-signature';
import { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import { NoopMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/noop';
import { ProductionMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/production';
import type { MonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/auth/monnify-webhook-auth';
import { PaymentCollectionWebhookHandler } from '@/fahari/payments/monnify/webhook/event-handler/payment-collection.handler';
import { MonnifyWebhookRouter } from '@/fahari/payments/monnify/webhook/monnify-webhook-router';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';
import reservedAccountFactory from '@/factories/fahari/reserved-account.factory';

describe('MonnifyWebhookController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let webhookController: MonnifyWebhookController;
  let emailClient: { send: jest.MockedFunction<EmailClient['send']> };
  let factory: PersistStrategy;
  const clientSecret = 'monnify-test-secret';

  function buildController(
    monnifyWebhookAuth: MonnifyWebhookAuth,
    mockEmailClient: { send: jest.MockedFunction<EmailClient['send']> }
  ): MonnifyWebhookController {
    const accountManager = new AccountManager(prismaService);
    const paymentCollectionService = new PaymentCollectionService(
      prismaService,
      accountManager,
    );
    const paymentNotificationService = new PaymentNotificationService(
      prismaService,
      paymentCollectionService,
      mockEmailClient,
    );
    const paymentCollectionWebhookHandler = new PaymentCollectionWebhookHandler(
      paymentCollectionService,
      paymentNotificationService,
    );
    const monnifyWebhookRouter = new MonnifyWebhookRouter([
      paymentCollectionWebhookHandler,
    ]);
    return new MonnifyWebhookController(
      monnifyWebhookAuth,
      monnifyWebhookRouter,
    );
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    emailClient = { send: jest.fn().mockResolvedValue(undefined) };
    webhookController = buildController(
      new NoopMonnifyWebhookAuth(),
      emailClient,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createDriverWithReservedAccount() {
    const driver = await factory.persist('user', () => userFactory.build());
    const reservedAccount = await factory.persist('reservedAccount', () =>
      reservedAccountFactory.monnifyAccount({
        userId: driver.id,
        customerEmail: driver.email,
      }),
    );

    return { driver, accountReference: reservedAccount.accountReference };
  }

  function successfulCollectionPayload(
    accountReference: string,
    transactionReference: string,
    customer: { name: string; email: string },
    amountPaid = 5000,
  ): MonnifyWebhookPayload {
    return {
      eventType: 'SUCCESSFUL_TRANSACTION',
      eventData: {
        product: {
          reference: accountReference,
          type: 'RESERVED_ACCOUNT',
        },
        transactionReference,
        paymentReference: transactionReference,
        amountPaid,
        totalPayable: amountPaid,
        currency: 'NGN',
        paidOn: '2021-11-17 11:28:42.615',
        paymentStatus: 'PAID',
        customer,
        paymentSourceInformation: [
          {
            bankCode: '232',
            amountPaid,
            accountName: 'Monnify Limited',
            sessionId: 'e6cV1smlpkwG38Cg6d5F9B2PRnIq5FqA',
            accountNumber: '0065432190',
          },
        ],
      },
    };
  }

  it('records a collection and emails the driver once', async () => {
    const { driver, accountReference } =
      await createDriverWithReservedAccount();
    const transactionReference = 'MNFY|04|20211117112842|000170';
    const payload = successfulCollectionPayload(
      accountReference,
      transactionReference,
      {
        name: `${driver.firstname} ${driver.lastname}`,
        email: driver.email,
      },
    );

    await webhookController.handleWebhook(payload);

    const collections = await prismaService.paymentCollection.findMany();
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      accountReference,
      userId: driver.id,
      transactionReference,
    });
    expect(emailClient.send).toHaveBeenCalledTimes(1);
  });

  it('does not email twice when the same webhook is replayed', async () => {
    const { driver, accountReference } =
      await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000171',
      {
        name: `${driver.firstname} ${driver.lastname}`,
        email: driver.email,
      },
    );

    await webhookController.handleWebhook(payload);
    await webhookController.handleWebhook(payload);

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.send).toHaveBeenCalledTimes(1);
  });

  it('rejects unmatched collections when no reserved account exists', async () => {
    const payload = successfulCollectionPayload(
      'FAH999999999',
      'MNFY|04|20211117112842|000172',
      { name: 'Unknown Driver', email: 'unknown@example.com' },
    );

    await expect(
      webhookController.handleWebhook(payload),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(await prismaService.paymentCollection.count()).toBe(0);
    expect(emailClient.send).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures in production', async () => {
    const monnifyClient = {
      secretKey: clientSecret,
    } as unknown as MonnifyClient;
    const productionController = buildController(
      new ProductionMonnifyWebhookAuth(monnifyClient),
      emailClient,
    );

    await expect(
      productionController.handleWebhook(
        successfulCollectionPayload('ref', 'txn', {
          name: 'Test Driver',
          email: 'driver@example.com',
        }),
        'invalid-signature',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid production signature', async () => {
    const { driver, accountReference } =
      await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000173',
      {
        name: `${driver.firstname} ${driver.lastname}`,
        email: driver.email,
      },
    );
    const signature = computeMonnifySignature(
      clientSecret,
      JSON.stringify(payload),
    );

    const monnifyClient = {
      secretKey: clientSecret,
    } as unknown as MonnifyClient;
    const productionController = buildController(
      new ProductionMonnifyWebhookAuth(monnifyClient),
      emailClient,
    );

    await productionController.handleWebhook(payload, signature);

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.send).toHaveBeenCalledTimes(1);
  });
});
