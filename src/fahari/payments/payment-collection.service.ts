import { Injectable, Logger } from '@nestjs/common';
import { PaymentCollection, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import {
  MONNIFY_RESERVED_ACCOUNT_PRODUCT,
  MONNIFY_SUCCESSFUL_TRANSACTION,
} from '@/fahari/payments/monnify/monnify.constants';
import type {
  MonnifyReservedAccountPaymentSource,
  MonnifyWebhookPayload,
} from '@/fahari/payments/monnify/monnify.types';

export interface IngestedPaymentCollection {
  collection: PaymentCollection;
  isNew: boolean;
}

@Injectable()
export class PaymentCollectionService {
  private readonly logger = new Logger(PaymentCollectionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly reservedAccountService: ReservedAccountService,
  ) {}

  async ingestSuccessfulCollection(
    payload: MonnifyWebhookPayload,
  ): Promise<IngestedPaymentCollection | null> {
    if (payload.eventType !== MONNIFY_SUCCESSFUL_TRANSACTION) {
      return null;
    }

    const { eventData } = payload;
    if (eventData.product?.type !== MONNIFY_RESERVED_ACCOUNT_PRODUCT) {
      return null;
    }

    const accountReference = eventData.product.reference;
    const transactionReference = eventData.transactionReference;
    this.logIfMissing(
      accountReference && transactionReference,
      'Reserved-account webhook missing accountReference or transactionReference',
    );
    if (!accountReference || !transactionReference) {
      return null;
    }

    const existing = await this.prismaService.paymentCollection.findUnique({
      where: { transactionReference },
    });
    if (existing) {
      return { collection: existing, isNew: false };
    }

    const reservedAccount =
      await this.reservedAccountService.findByAccountReference(
        accountReference,
      );
    this.logIfMissing(
      reservedAccount,
      `Unmatched payment collection for accountReference=${accountReference}`,
    );

    const paymentSource = primaryReservedAccountPaymentSource(
      eventData.paymentSourceInformation,
    );
    this.logIfMissing(
      paymentSource,
      `Reserved-account collection missing sender account details for transactionReference=${transactionReference}`,
    );

    try {
      const collection = await this.prismaService.paymentCollection.create({
        data: {
          transactionReference,
          accountReference,
          userId: reservedAccount?.userId,
          amountPaid: new Prisma.Decimal(eventData.amountPaid),
          paidOn: parseMonnifyPaidOn(eventData.paidOn),
          currency: eventData.currency ?? 'NGN',
          senderAccountNumber: paymentSource?.accountNumber ?? null,
          senderAccountName: paymentSource?.accountName ?? null,
        },
      });
      return { collection, isNew: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate =
          await this.prismaService.paymentCollection.findUniqueOrThrow({
            where: { transactionReference },
          });
        return { collection: duplicate, isNew: false };
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

  private logIfMissing(value: unknown, message: string): void {
    if (!value) {
      this.logger.warn(message);
    }
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

function parseMonnifyPaidOn(paidOn?: string): Date | null {
  if (!paidOn) {
    return null;
  }
  const normalized = paidOn.includes('T') ? paidOn : paidOn.replace(' ', 'T');
  const paidOnDate = new Date(normalized);
  if (Number.isNaN(paidOnDate.getTime())) {
    return null;
  }
  return paidOnDate;
}
