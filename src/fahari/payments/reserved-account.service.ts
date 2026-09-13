import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { defaultMonnifyBankConfig } from '@/fahari/payments/monnify/monnify-bank-config';
import {
  MonnifyApiError,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';
import {
  ReservedAccountRequestLog,
  ReservedAccountRequestStatus,
  ReservedAccountStatus,
} from '@/generated/prisma/client';
import {
  ReservedAccount,
  toDomainReservedAccount,
} from '@/fahari/payments/domain/reserved-account';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';

export interface ProvisionReservedAccountInput {
  requestedBy: number;
  ownerId: number;
  bvn: string;
  nin: string;
}

@Injectable()
export class ReservedAccountService {
  private readonly logger = new Logger(ReservedAccountService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly monnifyClient: MonnifyClient,
    private readonly accountManager: AccountManager,
  ) {}

  async provisionForUser(
    input: ProvisionReservedAccountInput,
  ): Promise<ReservedAccount> {
    const existingActive = await this.accountManager.getReservedAccount(
      input.ownerId,
    );
    if (existingActive) {
      return existingActive;
    }

    const owner = await this.prismaService.user.findUnique({
      where: { id: input.ownerId },
    });
    if (!owner) {
      throw new NotFoundException(`User ${input.ownerId} not found`);
    }

    const customerName = `${owner.firstname} ${owner.lastname}`.trim();
    const customerEmail = owner.email;
    const requestLog = await this.createPendingRequestLog(
      input.requestedBy,
      input.ownerId,
    );

    try {
      const monnifyAccount = await this.monnifyClient.reserveAccount({
        accountReference: requestLog.accountReference,
        accountName: customerName,
        customerName,
        customerEmail,
        currencyCode: 'NGN',
        contractCode: this.monnifyClient.contractCode,
        bvn: input.bvn,
        nin: input.nin,
        ...defaultMonnifyBankConfig(),
      });

      return this.completeSuccessfulProvision(requestLog, monnifyAccount);
    } catch (error) {
      if (
        error instanceof MonnifyApiError &&
        this.isDuplicateAccountError(error)
      ) {
        const existingOnMonnify = await this.monnifyClient.getReservedAccount(
          requestLog.accountReference,
        );
        return this.completeSuccessfulProvision(requestLog, existingOnMonnify);
      }

      await this.prismaService.reservedAccountRequestLog.update({
        where: { id: requestLog.id },
        data: {
          status: ReservedAccountRequestStatus.FAILED,
          failureMessage:
            error instanceof MonnifyApiError
              ? (error.responseMessage ?? error.message)
              : error instanceof Error
                ? error.message
                : 'Unknown error',
        },
      });
      this.logger.error(
        `Failed to provision reserved account for user: ${owner.id}`,
      );
      throw error;
    }
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
    return toDomainReservedAccount(persisted);
  }

  private async createPendingRequestLog(
    requestedBy: number,
    ownerId: number,
  ): Promise<ReservedAccountRequestLog> {
    return this.prismaService.reservedAccountRequestLog.create({
      data: {
        requestedBy,
        ownerId,
        accountPrefix: ACCOUNT_REFERENCE_PREFIX,
        status: ReservedAccountRequestStatus.PENDING,
      },
    });
  }

  private async completeSuccessfulProvision(
    requestLog: ReservedAccountRequestLog,
    monnifyAccount: ReserveAccountResponseBody,
  ): Promise<ReservedAccount> {
    const primaryBankAccount = monnifyAccount.accounts[0];
    if (!primaryBankAccount) {
      throw new MonnifyApiError(
        'Monnify reserved account response had no banks',
      );
    }

    const accountReference = `${requestLog.accountPrefix}${requestLog.accountCode}`;

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

    return toDomainReservedAccount(persisted);
  }

  private isDuplicateAccountError(error: MonnifyApiError): boolean {
    const message = (error.responseMessage ?? '').toLowerCase();
    return (
      message.includes('same reference') ||
      message.includes('more than 1 account') ||
      message.includes('already')
    );
  }
}
