import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentCollection, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import type {
  MonnifyReservedAccountPaymentSource,
  MonnifyWebhookPayload,
} from '@/fahari/payments/monnify/monnify.types';

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

    const paymentSource = primaryReservedAccountPaymentSource(
      eventData.paymentSourceInformation,
    );
    if (!paymentSource) {
      this.logger.error(
        `Reserved-account collection missing sender account details for transactionReference=${transactionReference}`,
      );
      throw new BadRequestException(
        `Missing sender account details for transactionReference=${transactionReference}`,
      );
    }

    try {
      return await this.prismaService.paymentCollection.create({
        data: {
          transactionReference,
          accountReference,
          userId: reservedAccount.userId,
          amountPaid: new Prisma.Decimal(eventData.amountPaid),
          paidOn: parseMonnifyPaidOn(eventData.paidOn),
          currency: eventData.currency,
          senderAccountNumber: paymentSource.accountNumber,
          senderAccountName: paymentSource.accountName,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prismaService.paymentCollection.findUniqueOrThrow({
          where: { transactionReference },
        });
      }
      throw error;
    }
  }

  async markNotified(paymentCollectionId: string): Promise<void> {
    await this.prismaService.paymentCollection.update({
      where: { id: paymentCollectionId },
      data: { notifiedAt: new Date() },
    });
  }
}

function primaryReservedAccountPaymentSource(
  paymentSources: MonnifyReservedAccountPaymentSource[] | undefined,
): MonnifyReservedAccountPaymentSource | null {
  const paymentSource = paymentSources?.[0];
  if (
    !paymentSource?.accountName?.trim() ||
    !paymentSource?.accountNumber?.trim()
  ) {
    return null;
  }
  return {
    ...paymentSource,
    accountName: paymentSource.accountName.trim(),
    accountNumber: paymentSource.accountNumber.trim(),
  };
}

function parseMonnifyPaidOn(paidOn: string): Date | null {
  const normalized = paidOn.includes('T') ? paidOn : paidOn.replace(' ', 'T');
  const paidOnDate = new Date(normalized);
  if (Number.isNaN(paidOnDate.getTime())) {
    return null;
  }
  return paidOnDate;
}
