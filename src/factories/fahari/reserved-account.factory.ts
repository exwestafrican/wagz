import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import {
  ReservedAccount,
  ReservedAccountStatus,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';

const reservedAccountFactory = Factory.define<ReservedAccount>(
  ({ sequence, params }) => {
    const accountPrefix = params.accountPrefix ?? ACCOUNT_REFERENCE_PREFIX;
    const accountCode = params.accountCode ?? 10_000 + sequence;
    return {
      id: params.id ?? faker.string.uuid(),
      userId: params.userId ?? sequence,
      accountPrefix,
      accountCode,
      accountReference: `${accountPrefix}${accountCode}`,
      accountNumber: params.accountNumber ?? faker.string.numeric(10),
      bankCode: params.bankCode ?? '50515',
      bankName: params.bankName ?? 'Moniepoint Microfinance Bank',
      customerEmail:
        params.customerEmail ?? faker.internet.email().toLowerCase(),
      status: params.status ?? ReservedAccountStatus.ACTIVE,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  },
);

export async function persistReservedAccount(
  prismaService: PrismaService,
  reservedAccount: ReservedAccount,
) {
  await prismaService.reservedAccount.create({
    data: {
      id: reservedAccount.id,
      userId: reservedAccount.userId,
      accountPrefix: reservedAccount.accountPrefix,
      accountCode: reservedAccount.accountCode,
      accountReference: reservedAccount.accountReference,
      accountNumber: reservedAccount.accountNumber,
      bankCode: reservedAccount.bankCode,
      bankName: reservedAccount.bankName,
      customerEmail: reservedAccount.customerEmail,
      status: reservedAccount.status,
      createdAt: reservedAccount.createdAt,
      updatedAt: reservedAccount.updatedAt,
    },
  });
}

export default reservedAccountFactory;
