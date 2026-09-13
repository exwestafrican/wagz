import { ApiProperty } from '@nestjs/swagger';
import { ReservedAccount } from '@/fahari/payments/domain/reserved-account';

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
