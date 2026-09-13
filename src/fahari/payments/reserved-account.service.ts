import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { defaultMonnifyBankConfig } from '@/fahari/payments/monnify/monnify-bank-config';
import {
  MonnifyApiError,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';
import {
  ReservedAccount,
  ReservedAccountRequestLog,
  ReservedAccountRequestStatus,
  ReservedAccountStatus,
} from '@/generated/prisma/client';

export interface ProvisionReservedAccountInput {
  requestedBy: number;
  ownerId: number;
  bvn: string;
  nin: string;
}

const ACCOUNT_REFERENCE_CREATE_ATTEMPTS = 5;

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
    const existingActive = await this.prismaService.reservedAccount.findFirst({
      where: {
        userId: input.ownerId,
        status: ReservedAccountStatus.ACTIVE,
      },
    });
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
    return this.prismaService.reservedAccount.findUnique({
      where: { accountReference },
    });
  }

  private async createPendingRequestLog(
    requestedBy: number,
    ownerId: number,
  ): Promise<ReservedAccountRequestLog> {
    for (
      let attempt = 0;
      attempt < ACCOUNT_REFERENCE_CREATE_ATTEMPTS;
      attempt++
    ) {
      const accountReference = this.accountManager.generateAccountReference();
      try {
        return await this.prismaService.reservedAccountRequestLog.create({
          data: {
            requestedBy,
            ownerId,
            accountReference,
            status: ReservedAccountRequestStatus.PENDING,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new MonnifyApiError(
      'Unable to allocate a unique reserved account reference',
    );
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

    const [, reservedAccount] = await this.prismaService.$transaction([
      this.prismaService.reservedAccountRequestLog.update({
        where: { id: requestLog.id },
        data: { status: ReservedAccountRequestStatus.SUCCESS },
      }),
      this.prismaService.reservedAccount.create({
        data: {
          userId: requestLog.ownerId,
          accountReference: monnifyAccount.accountReference,
          accountNumber: primaryBankAccount.accountNumber,
          bankCode: primaryBankAccount.bankCode,
          bankName: primaryBankAccount.bankName,
          customerEmail: monnifyAccount.customerEmail,
          status: ReservedAccountStatus.ACTIVE,
        },
      }),
    ]);

    return reservedAccount;
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
