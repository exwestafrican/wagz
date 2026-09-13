import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import {
  ReservedAccount,
  ReservedAccountStatus,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ACCOUNT_REFERENCE_PREFIX } from '@/fahari/payments/monnify/monnify.constants';

class ReservedAccountFactory extends Factory<ReservedAccount> {
  monnifyAccount(overrides: Partial<ReservedAccount> = {}) {
    return this.build({
      bankCode: '50515',
      bankName: 'Moniepoint Microfinance Bank',
      ...overrides,
    });
  }
}

const reservedAccountFactory = ReservedAccountFactory.define(
  ({ sequence, params }) => {
    const accountPrefix = params.accountPrefix ?? ACCOUNT_REFERENCE_PREFIX;
    const accountCode =
      params.accountCode ?? faker.number.int({ min: 10_000, max: 999_999 });
    return {
      id: faker.string.uuid(),
      userId: sequence,
      accountPrefix,
      accountCode,
      accountReference: `${accountPrefix}${accountCode}`,
      accountNumber: faker.string.numeric(10),
      bankCode: faker.string.numeric(5),
      bankName: faker.company.name(),
      customerEmail: faker.internet.email().toLowerCase(),
      status: ReservedAccountStatus.ACTIVE,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  },
);

export async function persistReservedAccount(
  prismaService: PrismaService,
  reservedAccount: ReservedAccount,
) {
  await prismaService.reservedAccount.create({ data: reservedAccount });
}

export default reservedAccountFactory;
