export interface ReserveAccountRequest {
  accountReference: string;
  accountName: string;
  currencyCode: string;
  contractCode: string;
  customerEmail: string;
  customerName: string;
  bvn: string;
  nin: string;
  getAllAvailableBanks: boolean;
  preferredBanks: string[];
}

export interface MonnifyBankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface ReserveAccountResponseBody {
  contractCode: string;
  accountReference: string;
  accountName: string;
  currencyCode: string;
  customerEmail: string;
  customerName: string;
  accounts: MonnifyBankAccount[];
  status: string;
}

export interface MonnifyApiEnvelope<T> {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: T;
}

/** Payer bank details on a reserved-account collection webhook. */
export interface MonnifyReservedAccountPaymentSource {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  amountPaid: number;
  sessionId: string;
}

/**
 * Successful collection into a reserved account.
 * We only process webhooks where product.type is RESERVED_ACCOUNT.
 */
export interface MonnifyReservedAccountCollectionEventData {
  product: {
    reference: string;
    type: string;
  };
  transactionReference: string;
  paymentReference: string;
  paidOn: string;
  amountPaid: number;
  totalPayable: number;
  currency: string;
  paymentStatus: string;
  paymentSourceInformation: MonnifyReservedAccountPaymentSource[];
  /** Reserved-account holder (driver), not the payer. Payer is paymentSourceInformation. */
  customer: {
    name: string;
    email: string;
  };
}

export interface MonnifyWebhookPayload {
  eventType: string;
  eventData: MonnifyReservedAccountCollectionEventData;
}

export class MonnifyApiError extends Error {
  constructor(
    message: string,
    readonly responseCode?: string,
    readonly responseMessage?: string,
  ) {
    super(message);
    this.name = 'MonnifyApiError';
  }
}

export function failureMessageFrom(error: unknown): string {
  if (error instanceof MonnifyApiError) {
    return error.responseMessage ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}
