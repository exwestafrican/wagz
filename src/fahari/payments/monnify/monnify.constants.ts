export const MONNIFY_SUCCESSFUL_TRANSACTION = 'SUCCESSFUL_TRANSACTION';
export const MONNIFY_RESERVED_ACCOUNT_PRODUCT = 'RESERVED_ACCOUNT';

export function accountReferenceForUser(userId: number): string {
  return `fahari_user_${userId}`;
}
