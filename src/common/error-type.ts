import { Prisma } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';

export function notInDbError(error: Error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_CODES.NOT_FOUND
  );
}
