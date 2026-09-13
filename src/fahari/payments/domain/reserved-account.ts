import { ReservedAccount as PersistedReservedAccount } from '@/generated/prisma/client';

export type ReservedAccount = {
  id: string;
  userId: number;
  accountReference: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  status: string;
  customerEmail: string;
};

export function toDomainReservedAccount(
  persisted: PersistedReservedAccount,
): ReservedAccount {
  return {
    id: persisted.id,
    userId: persisted.userId,
    accountReference: `${persisted.accountPrefix}${persisted.accountCode}`,
    accountNumber: persisted.accountNumber,
    bankCode: persisted.bankCode,
    bankName: persisted.bankName,
    status: persisted.status,
    customerEmail: persisted.customerEmail,
  };
}
