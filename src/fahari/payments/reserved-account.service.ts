import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountManager } from '@/fahari/payments/account-manager';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { defaultMonnifyBankConfig } from '@/fahari/payments/monnify/monnify-bank-config';
import { failureMessageFrom } from '@/fahari/payments/monnify/monnify.types';
import {
  ReservedAccountRequestLog,
  ReservedAccountRequestStatus,
} from '@/generated/prisma/client';
import { ReservedAccount } from '@/fahari/payments/domain/reserved-account';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';
import { fullName } from '@/fahari/user/full-name';
import { notInDbError } from '@/common/error-type';

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

  async provision(
    input: ProvisionReservedAccountInput,
  ): Promise<ReservedAccount> {
    const existingActive = await this.accountManager.getReservedAccount(
      input.ownerId,
    );
    if (existingActive) {
      return existingActive;
    }

    const owner = await this.findOwnerOrThrow(input.ownerId);
    const customerName = fullName(owner);
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

      return this.accountManager.provisionAccount(requestLog, monnifyAccount);
    } catch (error) {
      await this.prismaService.reservedAccountRequestLog.update({
        where: { id: requestLog.id },
        data: {
          status: ReservedAccountRequestStatus.FAILED,
          failureMessage: failureMessageFrom(error),
        },
      });
      this.logger.error(
        `Failed to provision reserved account for user: ${owner.id}`,
      );
      throw error;
    }
  }

  private async findOwnerOrThrow(ownerId: number) {
    try {
      return await this.prismaService.user.findUniqueOrThrow({
        where: { id: ownerId },
      });
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundException(`User ${ownerId} not found`);
      }
      throw error;
    }
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
}
