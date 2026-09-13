import { ApiProperty } from '@nestjs/swagger';
import { ReservedAccount } from '@/generated/prisma/client';

export class ReservedAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  accountReference: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  status: string;
}

export function toReservedAccountResponse(
  reservedAccount: ReservedAccount,
): ReservedAccountResponseDto {
  if (
    !reservedAccount.accountNumber ||
    !reservedAccount.bankCode ||
    !reservedAccount.bankName
  ) {
    throw new Error(
      `Reserved account ${reservedAccount.id} is missing bank details`,
    );
  }

  return {
    id: reservedAccount.id,
    userId: reservedAccount.userId,
    accountReference: reservedAccount.accountReference,
    accountNumber: reservedAccount.accountNumber,
    bankCode: reservedAccount.bankCode,
    bankName: reservedAccount.bankName,
    status: reservedAccount.status,
  };
}
