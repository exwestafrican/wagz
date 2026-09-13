export const MONNIFY_SUCCESSFUL_TRANSACTION = 'SUCCESSFUL_TRANSACTION';
export const MONNIFY_RESERVED_ACCOUNT_PRODUCT = 'RESERVED_ACCOUNT';

export const ACCOUNT_REFERENCE_PREFIX = 'FAH';

export function accountReferenceForUser(userId: number): string {
  return `${ACCOUNT_REFERENCE_PREFIX}${userId}`;
}
