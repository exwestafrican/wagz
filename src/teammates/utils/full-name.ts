import { Teammate } from '@/generated/prisma/client';

export function fullName(teammate: Teammate) {
  return `${teammate.firstName} ${teammate.lastName}`;
}
