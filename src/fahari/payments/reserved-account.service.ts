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
  ReservedAccountStatus,
} from '@/generated/prisma/client';

export interface ProvisionReservedAccountInput {
  userId: number;
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
        userId: input.userId,
        status: ReservedAccountStatus.ACTIVE,
        accountNumber: { not: null },
      },
    });
    if (existingActive?.accountNumber) {
      return existingActive;
    }

    const driver = await this.prismaService.user.findUnique({
      where: { id: input.userId },
    });
    if (!driver) {
      throw new NotFoundException(`User ${input.userId} not found`);
    }

    const customerName = `${driver.firstname} ${driver.lastname}`.trim();
    const customerEmail = driver.email;
    const pendingAccount = await this.createPendingReservedAccount(
      driver.id,
      customerEmail,
    );

    try {
      const monnifyAccount = await this.monnifyClient.reserveAccount({
        accountReference: pendingAccount.accountReference,
        accountName: customerName,
        customerName,
        customerEmail,
        currencyCode: 'NGN',
        contractCode: this.monnifyClient.contractCode,
        bvn: input.bvn,
        nin: input.nin,
        ...defaultMonnifyBankConfig(),
      });

      return this.persistActiveAccount(pendingAccount.id, monnifyAccount);
    } catch (error) {
      if (
        error instanceof MonnifyApiError &&
        this.isDuplicateAccountError(error)
      ) {
        const existingOnMonnify = await this.monnifyClient.getReservedAccount(
          pendingAccount.accountReference,
        );
        return this.persistActiveAccount(pendingAccount.id, existingOnMonnify);
      }

      await this.prismaService.reservedAccount.update({
        where: { id: pendingAccount.id },
        data: { status: ReservedAccountStatus.FAILED },
      });
      this.logger.error(
        `Failed to provision reserved account for user: ${driver.id}`,
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

  private async createPendingReservedAccount(
    userId: number,
    customerEmail: string,
  ): Promise<ReservedAccount> {
    for (
      let attempt = 0;
      attempt < ACCOUNT_REFERENCE_CREATE_ATTEMPTS;
      attempt++
    ) {
      const accountReference = this.accountManager.generateAccountReference();
      try {
        return await this.prismaService.reservedAccount.create({
          data: {
            userId,
            accountReference,
            customerEmail,
            status: ReservedAccountStatus.PENDING,
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

  private async persistActiveAccount(
    reservedAccountId: string,
    monnifyAccount: ReserveAccountResponseBody,
  ): Promise<ReservedAccount> {
    const primaryBankAccount = monnifyAccount.accounts[0];
    if (!primaryBankAccount) {
      throw new MonnifyApiError(
        'Monnify reserved account response had no banks',
      );
    }

    return this.prismaService.reservedAccount.update({
      where: { id: reservedAccountId },
      data: {
        accountReference: monnifyAccount.accountReference,
        accountNumber: primaryBankAccount.accountNumber,
        bankCode: primaryBankAccount.bankCode,
        bankName: primaryBankAccount.bankName,
        customerEmail: monnifyAccount.customerEmail,
        status: ReservedAccountStatus.ACTIVE,
      },
    });
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
