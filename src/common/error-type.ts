import { Prisma } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';

export function notInDbError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_CODES.NOT_FOUND
  );
}
