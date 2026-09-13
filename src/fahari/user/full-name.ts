import { User } from '@/generated/prisma/client';

export function fullName(user: Pick<User, 'firstname' | 'lastname'>): string {
  return `${user.firstname} ${user.lastname}`.trim();
}
