import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { Mail, EmailClient } from '@/messaging/email/email-client';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { accountReferenceForUser } from '@/fahari/payments/monnify/monnify.constants';
import { computeMonnifySignature } from '@/fahari/payments/monnify/monnify-signature';
import { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import { ReservedAccountStatus } from '@/generated/prisma/client';
import { render } from '@react-email/render';
import { ENVIROMENT } from '@/common/const';

class RecordingEmailClient implements EmailClient {
  readonly sent: Mail[] = [];

  send(email: Mail): Promise<void> {
    this.sent.push(email);
    return Promise.resolve();
  }
}

describe('MonnifyWebhookController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let webhookController: MonnifyWebhookController;
  let emailClient: RecordingEmailClient;
  const clientSecret = 'monnify-test-secret';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    emailClient = new RecordingEmailClient();

    const configService = {
      get: (key: string) => {
        if (key === 'NODE_ENV') {
          return ENVIROMENT.DEVELOPMENT;
        }
        return undefined;
      },
      getOrThrow: (key: string) => {
        if (key === 'MONNIFY_SECRET_KEY') {
          return clientSecret;
        }
        throw new Error(`Missing config ${key}`);
      },
    } as unknown as ConfigService;

    const monnifyClient = {
      clientSecret: () => clientSecret,
    } as unknown as MonnifyClient;

    const reservedAccountService = new ReservedAccountService(
      prismaService,
      monnifyClient,
    );
    const paymentCollectionService = new PaymentCollectionService(
      prismaService,
      reservedAccountService,
    );
    const paymentNotificationService = new PaymentNotificationService(
      prismaService,
      paymentCollectionService,
      emailClient,
    );

    webhookController = new MonnifyWebhookController(
      configService,
      monnifyClient,
      paymentCollectionService,
      paymentNotificationService,
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createDriverWithReservedAccount() {
    const driver = await prismaService.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        firstname: faker.person.firstName(),
        lastname: faker.person.lastName(),
      },
    });
    const accountReference = accountReferenceForUser(driver.id);
    await prismaService.reservedAccount.create({
      data: {
        userId: driver.id,
        accountReference,
        accountNumber: '6254727989',
        bankCode: '50515',
        bankName: 'Moniepoint Microfinance Bank',
        customerEmail: driver.email,
        status: ReservedAccountStatus.ACTIVE,
      },
    });
    return { driver, accountReference };
  }

  function successfulCollectionPayload(
    accountReference: string,
    transactionReference: string,
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
        amountPaid,
        currency: 'NGN',
        paidOn: '2021-11-17 11:28:42.615',
        paymentStatus: 'PAID',
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

  async function waitForEmails(expectedCount: number): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (emailClient.sent.length >= expectedCount) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  it('records a collection and emails the driver once', async () => {
    const { driver, accountReference } =
      await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000170',
    );

    await webhookController.handleWebhook(payload);
    await waitForEmails(1);

    const collections = await prismaService.paymentCollection.findMany();
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      transactionReference: 'MNFY|04|20211117112842|000170',
      accountReference,
      userId: driver.id,
      senderAccountName: 'Monnify Limited',
      senderAccountNumber: '0065432190',
    });
    expect(collections[0].notifiedAt).not.toBeNull();
    expect(emailClient.sent).toHaveLength(1);
    expect(emailClient.sent[0].to.email).toBe(driver.email);
    expect(emailClient.sent[0].subject).toContain('5000.00');
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          senderAccountName: 'Monnify Limited',
          senderAccountNumber: '0065432190',
        }),
      }),
    );
  });

  it('does not email twice when the same webhook is replayed', async () => {
    const { accountReference } = await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000171',
    );

    await webhookController.handleWebhook(payload);
    await waitForEmails(1);
    await webhookController.handleWebhook(payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.sent).toHaveLength(1);
  });

  it('stores unmatched collections without sending email', async () => {
    const payload = successfulCollectionPayload(
      'fahari_user_missing',
      'MNFY|04|20211117112842|000172',
    );

    await webhookController.handleWebhook(payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.sent).toHaveLength(0);
  });

  it('rejects invalid signatures in production', async () => {
    const productionConfig = {
      get: (key: string) => {
        if (key === 'NODE_ENV') {
          return ENVIROMENT.PRODUCTION;
        }
        return undefined;
      },
    } as unknown as ConfigService;
    const monnifyClient = {
      clientSecret: () => clientSecret,
    } as unknown as MonnifyClient;
    const reservedAccountService = new ReservedAccountService(
      prismaService,
      monnifyClient,
    );
    const paymentCollectionService = new PaymentCollectionService(
      prismaService,
      reservedAccountService,
    );
    const paymentNotificationService = new PaymentNotificationService(
      prismaService,
      paymentCollectionService,
      emailClient,
    );
    const productionController = new MonnifyWebhookController(
      productionConfig,
      monnifyClient,
      paymentCollectionService,
      paymentNotificationService,
    );

    await expect(
      productionController.handleWebhook(
        successfulCollectionPayload('ref', 'txn'),
        'invalid-signature',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid production signature', async () => {
    const { accountReference } = await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000173',
    );
    const signature = computeMonnifySignature(
      clientSecret,
      JSON.stringify(payload),
    );

    const productionConfig = {
      get: (key: string) => {
        if (key === 'NODE_ENV') {
          return ENVIROMENT.PRODUCTION;
        }
        return undefined;
      },
    } as unknown as ConfigService;
    const monnifyClient = {
      clientSecret: () => clientSecret,
    } as unknown as MonnifyClient;
    const reservedAccountService = new ReservedAccountService(
      prismaService,
      monnifyClient,
    );
    const paymentCollectionService = new PaymentCollectionService(
      prismaService,
      reservedAccountService,
    );
    const paymentNotificationService = new PaymentNotificationService(
      prismaService,
      paymentCollectionService,
      emailClient,
    );
    const productionController = new MonnifyWebhookController(
      productionConfig,
      monnifyClient,
      paymentCollectionService,
      paymentNotificationService,
    );

    await productionController.handleWebhook(payload, signature);
    await waitForEmails(1);

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.sent).toHaveLength(1);
  });
});
