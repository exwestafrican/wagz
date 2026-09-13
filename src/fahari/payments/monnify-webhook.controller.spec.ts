import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import { Mail, EmailClient } from '@/messaging/email/email-client';
import { AccountManager } from '@/fahari/payments/account-manager';
import { PaymentCollectionService } from '@/fahari/payments/payment-collection.service';
import { PaymentNotificationService } from '@/fahari/payments/payment-notification.service';
import { MonnifyWebhookController } from '@/fahari/payments/monnify-webhook.controller';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { computeMonnifySignature } from '@/fahari/payments/monnify/monnify-signature';
import { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';
import { ReservedAccountStatus } from '@/generated/prisma/client';
import { render } from '@react-email/render';
import { NoopMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/noop-monnify-webhook-auth';
import { ProductionMonnifyWebhookAuth } from '@/fahari/payments/monnify/webhook/production-monnify-webhook-auth';
import { PaymentCollectionWebhookHandler } from '@/fahari/payments/monnify/webhook/payment-collection-webhook-handler';
import { MonnifyWebhookRouter } from '@/fahari/payments/monnify/webhook/monnify-webhook-router';

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

  function buildController(
    monnifyWebhookAuth:
      | NoopMonnifyWebhookAuth
      | ProductionMonnifyWebhookAuth,
  ): MonnifyWebhookController {
    const accountManager = new AccountManager(prismaService);
    const paymentCollectionService = new PaymentCollectionService(
      prismaService,
      accountManager,
    );
    const paymentNotificationService = new PaymentNotificationService(
      prismaService,
      paymentCollectionService,
      emailClient,
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
    emailClient = new RecordingEmailClient();
    webhookController = buildController(new NoopMonnifyWebhookAuth());
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
    const accountReference = 'FAH102938';
    await prismaService.reservedAccount.create({
      data: {
        userId: driver.id,
        accountPrefix: 'FAH',
        accountCode: 102938,
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
      {
        name: `${driver.firstname} ${driver.lastname}`,
        email: driver.email,
      },
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
    const { driver, accountReference } = await createDriverWithReservedAccount();
    const payload = successfulCollectionPayload(
      accountReference,
      'MNFY|04|20211117112842|000171',
      {
        name: `${driver.firstname} ${driver.lastname}`,
        email: driver.email,
      },
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
      'FAH999999999',
      'MNFY|04|20211117112842|000172',
      { name: 'Unknown Driver', email: 'unknown@example.com' },
    );

    await webhookController.handleWebhook(payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.sent).toHaveLength(0);
  });

  it('rejects invalid signatures in production', async () => {
    const monnifyClient = {
      secretKey: clientSecret,
    } as unknown as MonnifyClient;
    const productionController = buildController(
      new ProductionMonnifyWebhookAuth(monnifyClient),
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
    const { driver, accountReference } = await createDriverWithReservedAccount();
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
    );

    await productionController.handleWebhook(payload, signature);
    await waitForEmails(1);

    expect(await prismaService.paymentCollection.count()).toBe(1);
    expect(emailClient.sent).toHaveLength(1);
  });
});
