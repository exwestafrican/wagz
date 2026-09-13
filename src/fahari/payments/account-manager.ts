import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ReservedAccount,
  toDomainReservedAccount,
} from '@/fahari/payments/domain/reserved-account';
import { ReservedAccountStatus } from '@/generated/prisma/client';

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
    return toDomainReservedAccount(persisted);
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
}
