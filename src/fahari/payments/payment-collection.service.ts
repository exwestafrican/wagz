import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentCollection, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import { existsInDbError } from '@/common/error-type';
import { firstOrThrow } from '@/common/utils';
import type { MonnifyWebhookPayload } from '@/fahari/payments/monnify/monnify.types';

@Injectable()
export class PaymentCollectionService {
  private readonly logger = new Logger(PaymentCollectionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly accountManager: AccountManager,
  ) {}

  async ingestSuccessfulCollection(
    payload: MonnifyWebhookPayload,
  ): Promise<PaymentCollection> {
    const { eventData } = payload;
    const accountReference = eventData.product.reference;
    const transactionReference = eventData.transactionReference;

    const existing = await this.prismaService.paymentCollection.findUnique({
      where: { transactionReference },
    });
    if (existing) {
      return existing;
    }

    const reservedAccount =
      await this.accountManager.findByAccountReference(accountReference);
    if (!reservedAccount) {
      this.logger.error(
        `Unmatched payment collection for accountReference=${accountReference}`,
      );
      throw new NotFoundException(
        `No reserved account for accountReference=${accountReference}`,
      );
    }

    const paymentSource = firstOrThrow(eventData.paymentSourceInformation);

    try {
      return await this.prismaService.paymentCollection.create({
        data: {
          transactionReference,
          accountReference,
          userId: reservedAccount.userId,
          amountPaid: new Prisma.Decimal(eventData.amountPaid),
          paidOn: parseMonnifyPaidOnOrThrow(eventData.paidOn),
          currency: eventData.currency,
          senderAccountNumber: paymentSource.accountNumber,
          senderAccountName: paymentSource.accountName,
        },
      });
    } catch (error) {
      if (existsInDbError(error)) {
        return this.prismaService.paymentCollection.findUniqueOrThrow({
          where: { transactionReference },
        });
      }
      throw error;
    }
  }

  async markNotified(paymentCollectionId: number): Promise<void> {
    await this.prismaService.paymentCollection.update({
      where: { id: paymentCollectionId },
      data: { notifiedAt: new Date() },
    });
  }
}

function parseMonnifyPaidOnOrThrow(paidOn: string): Date {
  const paidOnDate = new Date(paidOn.split(' ').join('T')); //example 2021-11-17 11:28:42.615 => 2021-11-17T11:28:42.615
  if (Number.isNaN(paidOnDate.getTime())) {
    throw new BadRequestException(`Invalid paidOn date: ${paidOn}`);
  }
  return paidOnDate;
}
