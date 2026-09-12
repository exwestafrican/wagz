import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservedAccount } from '@/generated/prisma/client';

export class ReservedAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  accountReference: string;

  @ApiPropertyOptional()
  accountNumber: string | null;

  @ApiPropertyOptional()
  bankCode: string | null;

  @ApiPropertyOptional()
  bankName: string | null;

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
