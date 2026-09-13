import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ReservedAccount } from '@/fahari/payments/domain/reserved-account';
import { first, isEmpty } from '@/common/utils';
import {
  MonnifyApiError,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';
import {
  ReservedAccount as PersistedReservedAccount,
  ReservedAccountRequestLog,
  ReservedAccountRequestStatus,
  ReservedAccountStatus,
} from '@/generated/prisma/client';

@Injectable()
export class AccountManager {
  constructor(private readonly prismaService: PrismaService) {}

  async getReservedAccount(userId: number): Promise<ReservedAccount | null> {
    const persisted = await this.prismaService.reservedAccount.findFirst({
      where: {
        userId,
        status: ReservedAccountStatus.ACTIVE,
      },
    });
    if (!persisted) {
      return null;
    }
    return this.toDomain(persisted);
  }

  async getReservedAccountOrThrow(userId: number): Promise<ReservedAccount> {
    const reservedAccount = await this.getReservedAccount(userId);
    if (!reservedAccount) {
      throw new NotFoundException(
        `Active reserved account not found for user: ${userId}`,
      );
    }
    return reservedAccount;
  }

  async findByAccountReference(
    accountReference: string,
  ): Promise<ReservedAccount | null> {
    const persisted = await this.prismaService.reservedAccount.findUnique({
      where: { accountReference },
    });
    if (!persisted) {
      return null;
    }
    return this.toDomain(persisted);
  }

  async provisionAccount(
    requestLog: ReservedAccountRequestLog,
    monnifyAccount: ReserveAccountResponseBody,
  ): Promise<ReservedAccount> {
    if (isEmpty(monnifyAccount.accounts)) {
      throw new MonnifyApiError(
        'Monnify reserved account response had no banks',
      );
    }

    const primaryBankAccount = first(monnifyAccount.accounts);
    if (!primaryBankAccount) {
      throw new MonnifyApiError(
        'Monnify reserved account response had no banks',
      );
    }

    const accountReference = this.toAccountReference(
      requestLog.accountPrefix,
      requestLog.accountCode,
    );

    const [, persisted] = await this.prismaService.$transaction([
      this.prismaService.reservedAccountRequestLog.update({
        where: { id: requestLog.id },
        data: { status: ReservedAccountRequestStatus.SUCCESS },
      }),
      this.prismaService.reservedAccount.create({
        data: {
          userId: requestLog.ownerId,
          accountPrefix: requestLog.accountPrefix,
          accountCode: requestLog.accountCode,
          accountReference,
          accountNumber: primaryBankAccount.accountNumber,
          bankCode: primaryBankAccount.bankCode,
          bankName: primaryBankAccount.bankName,
          customerEmail: monnifyAccount.customerEmail,
          status: ReservedAccountStatus.ACTIVE,
        },
      }),
    ]);

    return this.toDomain(persisted);
  }

  private toAccountReference(
    accountPrefix: string,
    accountCode: number,
  ): string {
    return `${accountPrefix}${accountCode}`;
  }

  private toDomain(persisted: PersistedReservedAccount): ReservedAccount {
    return {
      id: persisted.id,
      userId: persisted.userId,
      accountReference: this.toAccountReference(
        persisted.accountPrefix,
        persisted.accountCode,
      ),
      accountNumber: persisted.accountNumber,
      bankCode: persisted.bankCode,
      bankName: persisted.bankName,
      status: persisted.status,
      customerEmail: persisted.customerEmail,
    };
  }
}
