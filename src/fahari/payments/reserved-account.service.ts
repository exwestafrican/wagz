import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MonnifyClient } from '@/fahari/payments/monnify/monnify.client';
import { accountReferenceForUser } from '@/fahari/payments/monnify/monnify.constants';
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
  bvn?: string;
  nin?: string;
}

@Injectable()
export class ReservedAccountService {
  private readonly logger = new Logger(ReservedAccountService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly monnifyClient: MonnifyClient,
  ) {}

  async provisionForUser(
    input: ProvisionReservedAccountInput,
  ): Promise<ReservedAccount> {
    const existing = await this.prismaService.reservedAccount.findUnique({
      where: { userId: input.userId },
    });
    if (
      existing &&
      existing.status === ReservedAccountStatus.ACTIVE &&
      existing.accountNumber
    ) {
      return existing;
    }

    if (!input.bvn && !input.nin) {
      throw new BadRequestException('Either bvn or nin is required');
    }

    const driver = await this.prismaService.user.findUnique({
      where: { id: input.userId },
    });
    if (!driver) {
      throw new NotFoundException(`User ${input.userId} not found`);
    }

    const accountReference =
      existing?.accountReference ?? accountReferenceForUser(driver.id);
    const customerName = `${driver.firstname} ${driver.lastname}`.trim();
    const customerEmail = driver.email;

    const pendingAccount =
      existing ??
      (await this.prismaService.reservedAccount.create({
        data: {
          userId: driver.id,
          accountReference,
          customerEmail,
          status: ReservedAccountStatus.PENDING,
        },
      }));

    try {
      const monnifyAccount = await this.monnifyClient.reserveAccount({
        accountReference,
        accountName: customerName,
        customerName,
        customerEmail,
        currencyCode: 'NGN',
        contractCode: this.monnifyClient.contractCode(),
        bvn: input.bvn,
        nin: input.nin,
        getAllAvailableBanks: false,
      });

      return this.persistActiveAccount(pendingAccount.id, monnifyAccount);
    } catch (error) {
      if (
        error instanceof MonnifyApiError &&
        this.isDuplicateAccountError(error)
      ) {
        const existingOnMonnify =
          await this.monnifyClient.getReservedAccount(accountReference);
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
