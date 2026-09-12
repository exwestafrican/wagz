export interface ReserveAccountRequest {
  accountReference: string;
  accountName: string;
  currencyCode: string;
  contractCode: string;
  customerEmail: string;
  customerName: string;
  bvn?: string;
  nin?: string;
  getAllAvailableBanks?: boolean;
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

export interface MonnifyWebhookProduct {
  reference: string;
  type: string;
}

export interface MonnifySuccessfulTransactionEventData {
  product: MonnifyWebhookProduct;
  transactionReference: string;
  paymentReference?: string;
  paidOn?: string;
  amountPaid: number;
  totalPayable?: number;
  currency?: string;
  paymentStatus?: string;
  customer?: {
    name?: string;
    email?: string;
  };
}

export interface MonnifyWebhookPayload {
  eventType: string;
  eventData: MonnifySuccessfulTransactionEventData;
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
